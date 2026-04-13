// =============================================================
// Rule-Based Email Classifier — no LLM, pure header/pattern analysis
// =============================================================

import type { EmailClassification, EmailPriority } from "@/types/email";

export interface RuleClassificationInput {
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  headers_json: Record<string, unknown> | null;
  in_reply_to: string | null;
  references_header: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  is_auto_reply: boolean;
}

export interface RuleClassificationResult {
  classification: EmailClassification | null;
  priority: EmailPriority | null;
  confidence: "high" | "medium";
  rule: string;
}

// ---------------------------------------------------------------------------
// Header helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive header lookup. Returns the value if found, undefined otherwise.
 */
function getHeader(
  headers: Record<string, unknown> | null,
  name: string
): string | undefined {
  if (!headers) return undefined;

  const lowerName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) {
      const val = headers[key];
      if (val === null || val === undefined) return undefined;
      return String(val);
    }
  }
  return undefined;
}

/**
 * Check whether a header exists (case-insensitive), regardless of value.
 */
function hasHeader(
  headers: Record<string, unknown> | null,
  name: string
): boolean {
  return getHeader(headers, name) !== undefined;
}

// ---------------------------------------------------------------------------
// Classification rules (order = precedence)
// ---------------------------------------------------------------------------

/**
 * Rule 1: Auto-Reply detection
 */
function checkAutoReply(
  input: RuleClassificationInput
): RuleClassificationResult | null {
  // Already flagged by IMAP sync
  if (input.is_auto_reply) {
    return {
      classification: "auto_reply",
      priority: "irrelevant",
      confidence: "high",
      rule: "auto-reply-flag",
    };
  }

  // Auto-Submitted header (RFC 3834) — any value except "no" means auto-generated
  const autoSubmitted = getHeader(input.headers_json, "Auto-Submitted");
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") {
    return {
      classification: "auto_reply",
      priority: "irrelevant",
      confidence: "high",
      rule: "auto-reply-header-auto-submitted",
    };
  }

  // X-Auto-Response-Suppress (Microsoft)
  if (hasHeader(input.headers_json, "X-Auto-Response-Suppress")) {
    return {
      classification: "auto_reply",
      priority: "irrelevant",
      confidence: "high",
      rule: "auto-reply-header-x-auto-response-suppress",
    };
  }

  // Subject-based auto-reply patterns
  if (input.subject) {
    const subjectLower = input.subject.toLowerCase().trimStart();
    const autoReplyPrefixes = [
      "auto:",
      "automatic reply:",
      "abwesenheitsnotiz:",
      "out of office:",
    ];
    for (const prefix of autoReplyPrefixes) {
      if (subjectLower.startsWith(prefix)) {
        return {
          classification: "auto_reply",
          priority: "irrelevant",
          confidence: "high",
          rule: `auto-reply-subject-${prefix.replace(/[: ]/g, "-").replace(/-+$/, "")}`,
        };
      }
    }
  }

  // Body content patterns (check first 1000 chars only)
  if (input.body_text) {
    const bodySnippet = input.body_text.slice(0, 1000).toLowerCase();

    const autoReplyBodyPatterns = [
      // German OOO patterns
      /ich bin vom\b.*?\bbis\b/,
      /ich bin ab\b.*?(?:nicht erreichbar|abwesend|nicht im b[uü]ro)/,
      /automatische antwort/,
      /abwesenheitsnotiz/,
      /im urlaub/,
      // English OOO patterns
      /out of office/,
      /i am currently out/,
      /i will be out/,
      /automatic reply/,
      /currently unavailable/,
      /on vacation/,
      /on leave/,
    ];

    for (const pattern of autoReplyBodyPatterns) {
      if (pattern.test(bodySnippet)) {
        return {
          classification: "auto_reply",
          priority: "irrelevant",
          confidence: "high",
          rule: "auto-reply-body-content",
        };
      }
    }
  }

  return null;
}

/**
 * Rule 2: Newsletter detection
 */
function checkNewsletter(
  input: RuleClassificationInput
): RuleClassificationResult | null {
  // List-Unsubscribe header (RFC 2369)
  if (hasHeader(input.headers_json, "List-Unsubscribe")) {
    return {
      classification: "newsletter",
      priority: "niedrig",
      confidence: "high",
      rule: "newsletter-list-unsubscribe",
    };
  }

  // List-Id header (RFC 2919)
  if (hasHeader(input.headers_json, "List-Id")) {
    return {
      classification: "newsletter",
      priority: "niedrig",
      confidence: "high",
      rule: "newsletter-list-id",
    };
  }

  // Sender address patterns
  const fromLower = input.from_address.toLowerCase();
  const newsletterPrefixes = [
    "newsletter@",
    "noreply@",
    "no-reply@",
    "info@",
    "news@",
  ];
  for (const prefix of newsletterPrefixes) {
    if (fromLower.startsWith(prefix)) {
      return {
        classification: "newsletter",
        priority: "niedrig",
        confidence: "high",
        rule: `newsletter-sender-${prefix.replace("@", "")}`,
      };
    }
  }

  return null;
}

/**
 * Rule 3: Reply detection
 */
function checkReply(
  input: RuleClassificationInput
): RuleClassificationResult | null {
  // in_reply_to is set — this is a reply to a known message
  if (input.in_reply_to) {
    return {
      classification: "antwort",
      priority: "normal",
      confidence: "medium",
      rule: "reply-in-reply-to",
    };
  }

  // Subject starts with reply prefixes
  if (input.subject) {
    const subjectLower = input.subject.toLowerCase().trimStart();
    const replyPrefixes = ["re:", "aw:"];
    for (const prefix of replyPrefixes) {
      if (subjectLower.startsWith(prefix)) {
        return {
          classification: "antwort",
          priority: "normal",
          confidence: "medium",
          rule: `reply-subject-${prefix.replace(":", "")}`,
        };
      }
    }
  }

  return null;
}

/**
 * Rule 4: Known contact with active deal
 */
function checkKnownContactWithDeal(
  input: RuleClassificationInput
): RuleClassificationResult | null {
  if (input.contact_id && input.deal_id) {
    return {
      classification: "anfrage",
      priority: "dringend",
      confidence: "medium",
      rule: "known-contact-with-deal",
    };
  }
  return null;
}

/**
 * Rule 5: Known contact without deal
 */
function checkKnownContactNoDeal(
  input: RuleClassificationInput
): RuleClassificationResult | null {
  if (input.contact_id && !input.deal_id) {
    return {
      classification: "anfrage",
      priority: "normal",
      confidence: "medium",
      rule: "known-contact-no-deal",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

const RULES = [
  checkAutoReply,
  checkNewsletter,
  checkReply,
  checkKnownContactWithDeal,
  checkKnownContactNoDeal,
] as const;

/**
 * Classify an email using rule-based pattern matching.
 *
 * Rules are evaluated in order of precedence. The first matching rule wins.
 * If no rule matches, the result indicates that LLM classification is needed.
 */
export function classifyByRules(
  input: RuleClassificationInput
): RuleClassificationResult {
  for (const rule of RULES) {
    const result = rule(input);
    if (result) return result;
  }

  return {
    classification: null,
    priority: null,
    confidence: "medium",
    rule: "no-rule-matched",
  };
}
