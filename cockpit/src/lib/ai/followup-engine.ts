// =============================================================
// Followup Engine — Candidate detection + LLM-powered reasoning
// for KI-Wiedervorlagen (FEAT-408)
// =============================================================
//
// Detects CRM items that need followup attention, generates
// reasoning via Bedrock, and creates action queue entries for
// human-in-the-loop approval.

import { createAdminClient } from "@/lib/supabase/admin";
import { queryLLM } from "./bedrock-client";
import { parseLLMResponse } from "./parser";
import type { SchemaValidator } from "./parser";
import { createAction } from "./action-queue";
import {
  getFollowupSuggestSystemPrompt,
  buildFollowupSuggestPrompt,
} from "./prompts/followup-suggest";

// =============================================================
// Types
// =============================================================

export interface FollowupCandidate {
  type:
    | "stagnant_deal"
    | "open_proposal"
    | "inactive_contact"
    | "unanswered_email";
  title: string;
  entityType: "deal" | "contact" | "email_message";
  entityId: string;
  daysSince: number;
  context: {
    dealValue?: number | null;
    dealStage?: string | null;
    companyName?: string | null;
    contactName?: string | null;
    lastActivity?: string | null;
    proposalValue?: number | null;
    emailSubject?: string | null;
  };
}

export interface FollowupSuggestion {
  reasoning: string;
  suggested_action: string;
  urgency: "dringend" | "normal" | "niedrig";
}

export interface FollowupResult {
  candidates: number;
  suggested: number;
  failed: number;
  skipped: number;
}

// =============================================================
// Validator
// =============================================================

const VALID_URGENCY = ["dringend", "normal", "niedrig"] as const;

const validateFollowupSuggestion: SchemaValidator<FollowupSuggestion> = (
  data: unknown
): FollowupSuggestion | null => {
  if (typeof data !== "object" || data === null) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.reasoning !== "string" || d.reasoning.trim() === "") return null;
  if (typeof d.suggested_action !== "string" || d.suggested_action.trim() === "")
    return null;
  if (
    typeof d.urgency !== "string" ||
    !VALID_URGENCY.includes(d.urgency as (typeof VALID_URGENCY)[number])
  )
    return null;

  return {
    reasoning: d.reasoning.trim(),
    suggested_action: d.suggested_action.trim(),
    urgency: d.urgency as FollowupSuggestion["urgency"],
  };
};

// =============================================================
// Helper — days since a given ISO date
// =============================================================

function daysSinceDate(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// =============================================================
// 1. findFollowupCandidates
// =============================================================

/**
 * Queries the database for CRM items that need followup attention.
 *
 * Categories (in priority order):
 * a) Stagnant deals — active deals with no update for >14 days
 * b) Open proposals — proposals with status 'sent' for >7 days
 * c) Unanswered emails — classified emails still unread for >3 days
 *
 * Note: Inactive contacts are deferred to a later version.
 * The heuristic for "inactive" requires a complex GROUP BY on
 * activities which is impractical with the Supabase query builder.
 */
export async function findFollowupCandidates(
  limit: number = 20
): Promise<FollowupCandidate[]> {
  const supabase = createAdminClient();
  const candidates: FollowupCandidate[] = [];

  // Threshold dates
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  ).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  // ---------------------------------------------------------------
  // a) Stagnant deals — active deals not updated for >14 days
  // ---------------------------------------------------------------
  try {
    const { data: stagnantDeals, error: dealsError } = await supabase
      .from("deals")
      .select(
        `
        id,
        title,
        value,
        updated_at,
        pipeline_stages ( name ),
        contacts ( first_name, last_name ),
        companies ( name )
      `
      )
      .eq("status", "active")
      .lt("updated_at", fourteenDaysAgo)
      .order("value", { ascending: false, nullsFirst: false })
      .limit(8);

    if (dealsError) {
      console.error("[FollowupEngine] Stagnant deals query failed:", dealsError.message);
    } else if (stagnantDeals) {
      for (const deal of stagnantDeals) {
        const stage = deal.pipeline_stages as unknown as { name: string } | null;
        const contact = deal.contacts as unknown as {
          first_name: string | null;
          last_name: string | null;
        } | null;
        const company = deal.companies as unknown as { name: string } | null;

        const contactName =
          contact
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
            : null;

        candidates.push({
          type: "stagnant_deal",
          title: deal.title,
          entityType: "deal",
          entityId: deal.id,
          daysSince: daysSinceDate(deal.updated_at),
          context: {
            dealValue: deal.value ?? null,
            dealStage: stage?.name ?? null,
            companyName: company?.name ?? null,
            contactName: contactName || null,
            lastActivity: deal.updated_at,
          },
        });
      }
    }
  } catch (err) {
    console.error("[FollowupEngine] Stagnant deals error:", err);
  }

  // ---------------------------------------------------------------
  // b) Open proposals — sent for >7 days without response
  // ---------------------------------------------------------------
  try {
    const { data: openProposals, error: proposalsError } = await supabase
      .from("proposals")
      .select(
        `
        id,
        title,
        value,
        sent_at,
        deal_id,
        deals ( title, companies ( name ) )
      `
      )
      .eq("status", "sent")
      .lt("sent_at", sevenDaysAgo)
      .order("value", { ascending: false, nullsFirst: false })
      .limit(5);

    if (proposalsError) {
      console.error(
        "[FollowupEngine] Open proposals query failed:",
        proposalsError.message
      );
    } else if (openProposals) {
      for (const proposal of openProposals) {
        const deal = proposal.deals as unknown as {
          title: string;
          companies: { name: string } | null;
        } | null;

        // Use deal_id if available, otherwise fall back to proposal id
        const entityId = proposal.deal_id ?? proposal.id;
        const entityType = proposal.deal_id ? "deal" : "deal";

        candidates.push({
          type: "open_proposal",
          title: proposal.title,
          entityType: entityType as "deal",
          entityId,
          daysSince: proposal.sent_at
            ? daysSinceDate(proposal.sent_at)
            : 0,
          context: {
            proposalValue: proposal.value ?? null,
            companyName: deal?.companies?.name ?? null,
            lastActivity: proposal.sent_at,
          },
        });
      }
    }
  } catch (err) {
    console.error("[FollowupEngine] Open proposals error:", err);
  }

  // ---------------------------------------------------------------
  // c) Unanswered emails — classified, unread for >3 days
  //
  // Only business-relevant classifications (not auto_reply,
  // newsletter, spam).
  // ---------------------------------------------------------------
  try {
    const { data: unansweredEmails, error: emailsError } = await supabase
      .from("email_messages")
      .select("id, subject, from_name, from_address, received_at")
      .in("classification", ["anfrage", "antwort", "intern"])
      .eq("is_read", false)
      .lt("received_at", threeDaysAgo)
      .order("received_at", { ascending: true })
      .limit(7);

    if (emailsError) {
      console.error(
        "[FollowupEngine] Unanswered emails query failed:",
        emailsError.message
      );
    } else if (unansweredEmails) {
      for (const email of unansweredEmails) {
        const displayName =
          email.from_name ?? email.from_address ?? "Unbekannter Absender";

        candidates.push({
          type: "unanswered_email",
          title: `E-Mail von ${displayName}`,
          entityType: "email_message",
          entityId: email.id,
          daysSince: email.received_at
            ? daysSinceDate(email.received_at)
            : 0,
          context: {
            emailSubject: email.subject ?? null,
            contactName: email.from_name ?? null,
            lastActivity: email.received_at,
          },
        });
      }
    }
  } catch (err) {
    console.error("[FollowupEngine] Unanswered emails error:", err);
  }

  // ---------------------------------------------------------------
  // Sort all candidates by daysSince (most overdue first) and limit
  // ---------------------------------------------------------------
  candidates.sort((a, b) => b.daysSince - a.daysSince);

  return candidates.slice(0, limit);
}

// =============================================================
// 2. generateFollowupSuggestion
// =============================================================

/**
 * Calls Bedrock to generate reasoning for a single followup candidate.
 *
 * @returns FollowupSuggestion or null on failure
 */
export async function generateFollowupSuggestion(
  candidate: FollowupCandidate
): Promise<FollowupSuggestion | null> {
  const systemPrompt = getFollowupSuggestSystemPrompt();
  const userPrompt = buildFollowupSuggestPrompt({
    type: candidate.type,
    title: candidate.title,
    daysSince: candidate.daysSince,
    context: candidate.context,
  });

  const llmResult = await queryLLM(userPrompt, systemPrompt, {
    temperature: 0.3,
    maxTokens: 512,
  });

  if (!llmResult.success || !llmResult.data) {
    console.error(
      "[FollowupEngine] LLM call failed for candidate:",
      candidate.entityId,
      llmResult.error
    );
    return null;
  }

  const parsed = parseLLMResponse(llmResult.data, validateFollowupSuggestion);

  if (!parsed.success || !parsed.data) {
    console.error(
      "[FollowupEngine] LLM response parse failed for candidate:",
      candidate.entityId,
      parsed.error
    );
    return null;
  }

  return parsed.data;
}

// =============================================================
// 3. processFollowupCandidates
// =============================================================

/**
 * Main orchestration function called by the cron route.
 *
 * 1. Finds followup candidates
 * 2. Checks dedup (skip if pending action already exists)
 * 3. Generates reasoning via Bedrock
 * 4. Creates action queue entries for human approval
 *
 * Processes sequentially to avoid overwhelming Bedrock.
 */
export async function processFollowupCandidates(
  limit: number = 20
): Promise<FollowupResult> {
  const result: FollowupResult = {
    candidates: 0,
    suggested: 0,
    failed: 0,
    skipped: 0,
  };

  // Step 1: Find candidates
  const candidates = await findFollowupCandidates(limit);
  result.candidates = candidates.length;

  if (candidates.length === 0) {
    return result;
  }

  const supabase = createAdminClient();

  // Step 2: Process each candidate sequentially
  for (const candidate of candidates) {
    const dedupKey = `followup-${candidate.entityType}-${candidate.entityId}`;

    try {
      // Dedup check: skip if a pending action with same dedup_key exists
      const { data: existing } = await supabase
        .from("ai_action_queue")
        .select("id")
        .eq("dedup_key", dedupKey)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      // Generate suggestion via LLM
      const suggestion = await generateFollowupSuggestion(candidate);

      if (!suggestion) {
        result.failed++;
        continue;
      }

      // Create action queue entry for human approval
      const expiresAt = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();

      await createAction({
        type: "followup",
        action_description: suggestion.suggested_action,
        reasoning: suggestion.reasoning,
        entity_type: candidate.entityType,
        entity_id: candidate.entityId,
        source: "followup_engine",
        priority: suggestion.urgency,
        dedup_key: dedupKey,
        expires_at: expiresAt,
      });

      result.suggested++;
    } catch (err) {
      console.error(
        "[FollowupEngine] Error processing candidate:",
        candidate.entityId,
        err
      );
      result.failed++;
    }
  }

  return result;
}
