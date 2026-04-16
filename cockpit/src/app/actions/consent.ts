"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { extractClientIp, hashIp, hashUserAgent } from "@/lib/security/ip-hash";
import { sendConsentRequestMail } from "@/lib/email/send-consent-mail";
import type { ConsentSource } from "@/app/(app)/contacts/actions";

const TOKEN_TTL_DAYS = 30;

type PublicActionResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "expired" | "rate_limited" | "invalid_state" | "server_error" };

function generateConsentToken(): string {
  return randomBytes(32).toString("hex");
}

async function captureRequestMetadata() {
  const h = await headers();
  const ip = extractClientIp(h);
  const ua = h.get("user-agent");
  return {
    ip_hash: hashIp(ip),
    user_agent_hash: hashUserAgent(ua),
    ip_raw_for_rate_limit: ip,
  };
}

type ConsentAuditAction =
  | "consent_requested"
  | "consent_granted"
  | "consent_declined"
  | "consent_revoked"
  | "communication_opt_out_changed";

async function logConsentAudit(params: {
  action: ConsentAuditAction;
  contactId: string;
  actorId: string | null;
  actorLabel: "user" | "public";
  changes?: Record<string, unknown>;
  ipHash?: string | null;
  userAgentHash?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const payload: Record<string, unknown> = {
      actor_label: params.actorLabel,
      ...(params.changes ?? {}),
    };
    if (params.ipHash) payload.ip_hash = params.ipHash;
    if (params.userAgentHash) payload.user_agent_hash = params.userAgentHash;

    await admin.from("audit_log").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: "contact",
      entity_id: params.contactId,
      changes: payload,
      context: null,
    });
  } catch {
    // audit failure must not break consent flow
  }
}

// ============================================================
// Authenticated Actions
// ============================================================

export async function createConsentRequest(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const { data: contact, error: loadError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, consent_status")
    .eq("id", contactId)
    .single();

  if (loadError || !contact) return { error: "Kontakt nicht gefunden." };
  if (!contact.email) return { error: "Kontakt hat keine E-Mail-Adresse." };

  const token = generateConsentToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const source: ConsentSource = "email_link";
  const { error: updateError } = await supabase
    .from("contacts")
    .update({
      consent_token: token,
      consent_token_expires_at: expiresAt.toISOString(),
      consent_requested_at: now.toISOString(),
      consent_source: source,
      consent_status: contact.consent_status === "granted" ? "granted" : "pending",
    })
    .eq("id", contactId);

  if (updateError) return { error: updateError.message };

  await logConsentAudit({
    action: "consent_requested",
    contactId,
    actorId: user.id,
    actorLabel: "user",
    changes: { consent_source: source },
  });

  const mailResult = await sendConsentRequestMail({
    toEmail: contact.email,
    firstName: contact.first_name,
    lastName: contact.last_name,
    token,
  });

  revalidatePath(`/kontakte/${contactId}`);
  revalidatePath("/kontakte");

  if (!mailResult.ok) {
    return { error: `Token gesetzt, aber Mail-Versand fehlgeschlagen: ${mailResult.error}` };
  }
  return { error: "" };
}

export async function revokeConsentManual(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("contacts")
    .update({
      consent_status: "revoked",
      consent_date: new Date().toISOString(),
      consent_token: null,
      consent_token_expires_at: null,
    })
    .eq("id", contactId);

  if (error) return { error: error.message };

  await logConsentAudit({
    action: "consent_revoked",
    contactId,
    actorId: user.id,
    actorLabel: "user",
    changes: { source: "manual_ui" },
  });

  revalidatePath(`/kontakte/${contactId}`);
  revalidatePath("/kontakte");
  return { error: "" };
}

export async function setOptOutCommunication(contactId: string, optOut: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const { data: before } = await supabase
    .from("contacts")
    .select("opt_out_communication")
    .eq("id", contactId)
    .single();

  const { error } = await supabase
    .from("contacts")
    .update({ opt_out_communication: optOut })
    .eq("id", contactId);

  if (error) return { error: error.message };

  await logConsentAudit({
    action: "communication_opt_out_changed",
    contactId,
    actorId: user.id,
    actorLabel: "user",
    changes: {
      before: before?.opt_out_communication ?? false,
      after: optOut,
    },
  });

  revalidatePath(`/kontakte/${contactId}`);
  revalidatePath("/kontakte");
  return { error: "" };
}

// ============================================================
// Public Token-Actions (no auth, called from /consent/[token])
// ============================================================

async function loadContactByToken(token: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .select(
      "id, first_name, last_name, email, consent_status, consent_token, consent_token_expires_at"
    )
    .eq("consent_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function grantConsent(token: string): Promise<PublicActionResult> {
  const { ip_hash, user_agent_hash, ip_raw_for_rate_limit } = await captureRequestMetadata();

  const rl = checkRateLimit(`consent:${ip_raw_for_rate_limit ?? "unknown"}`);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const contact = await loadContactByToken(token);
  if (!contact) return { ok: false, error: "not_found" };
  if (
    contact.consent_token_expires_at &&
    new Date(contact.consent_token_expires_at) < new Date()
  ) {
    return { ok: false, error: "expired" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("contacts")
    .update({
      consent_status: "granted",
      consent_date: new Date().toISOString(),
      consent_token: null,
      consent_token_expires_at: null,
    })
    .eq("id", contact.id);

  if (error) return { ok: false, error: "server_error" };

  await logConsentAudit({
    action: "consent_granted",
    contactId: contact.id,
    actorId: null,
    actorLabel: "public",
    ipHash: ip_hash,
    userAgentHash: user_agent_hash,
  });

  return { ok: true };
}

export async function declineConsent(token: string): Promise<PublicActionResult> {
  const { ip_hash, user_agent_hash, ip_raw_for_rate_limit } = await captureRequestMetadata();

  const rl = checkRateLimit(`consent:${ip_raw_for_rate_limit ?? "unknown"}`);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const contact = await loadContactByToken(token);
  if (!contact) return { ok: false, error: "not_found" };
  if (
    contact.consent_token_expires_at &&
    new Date(contact.consent_token_expires_at) < new Date()
  ) {
    return { ok: false, error: "expired" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("contacts")
    .update({
      consent_status: "declined",
      consent_date: new Date().toISOString(),
      consent_token: null,
      consent_token_expires_at: null,
    })
    .eq("id", contact.id);

  if (error) return { ok: false, error: "server_error" };

  await logConsentAudit({
    action: "consent_declined",
    contactId: contact.id,
    actorId: null,
    actorLabel: "public",
    ipHash: ip_hash,
    userAgentHash: user_agent_hash,
  });

  return { ok: true };
}

export async function revokeConsentPublic(token: string): Promise<PublicActionResult> {
  const { ip_hash, user_agent_hash, ip_raw_for_rate_limit } = await captureRequestMetadata();

  const rl = checkRateLimit(`consent:${ip_raw_for_rate_limit ?? "unknown"}`);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const admin = createAdminClient();
  const { data: contact, error: loadError } = await admin
    .from("contacts")
    .select("id, consent_status")
    .eq("consent_token", token)
    .maybeSingle();

  if (loadError || !contact) return { ok: false, error: "not_found" };

  const { error } = await admin
    .from("contacts")
    .update({
      consent_status: "revoked",
      consent_date: new Date().toISOString(),
      consent_token: null,
      consent_token_expires_at: null,
    })
    .eq("id", contact.id);

  if (error) return { ok: false, error: "server_error" };

  await logConsentAudit({
    action: "consent_revoked",
    contactId: contact.id,
    actorId: null,
    actorLabel: "public",
    ipHash: ip_hash,
    userAgentHash: user_agent_hash,
    changes: { source: "public_revoke_link" },
  });

  return { ok: true };
}
