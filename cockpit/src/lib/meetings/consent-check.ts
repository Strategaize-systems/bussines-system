// =============================================================
// Consent Check — Verify recording consent for meeting participants
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ContactConsentInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  consent_status: string | null;
}

export interface ConsentCheckResult {
  /** Whether all participants have granted consent */
  allGranted: boolean;
  /** Contacts that do NOT have granted consent */
  missing: ContactConsentInfo[];
  /** Contacts that have granted consent */
  granted: ContactConsentInfo[];
}

/**
 * Check consent status for a list of contact IDs.
 * Returns which contacts have granted consent and which are missing.
 *
 * V8.16 SLC-914 MT-1 (ISSUE-131): optionaler `client` — der Caller (startMeeting,
 * User-Client + RLS `can_see_owner`) reicht seinen Client durch, damit der
 * Consent-Read RLS-scoped laeuft und keine fremde Contact-PII zurueckgibt.
 * Ohne Argument bleibt das Verhalten identisch (createAdminClient, backward-compat).
 */
export async function checkConsentStatus(
  contactIds: string[],
  client?: SupabaseClient,
): Promise<ConsentCheckResult> {
  if (contactIds.length === 0) {
    return { allGranted: true, missing: [], granted: [] };
  }

  const db = client ?? createAdminClient();
  const { data: contacts, error } = await db
    .from("contacts")
    .select("id, first_name, last_name, email, consent_status")
    .in("id", contactIds);

  if (error) {
    throw new Error(`Consent-Check fehlgeschlagen: ${error.message}`);
  }

  const granted: ContactConsentInfo[] = [];
  const missing: ContactConsentInfo[] = [];

  for (const contact of (contacts ?? [])) {
    if (contact.consent_status === "granted") {
      granted.push(contact);
    } else {
      missing.push(contact);
    }
  }

  // ISSUE-142 / SLC-915 MT-2: fail-closed. Jede angeforderte contactId ohne
  // zurueckgegebene Row (nicht existent ODER per RLS `can_see_owner` weggefiltert)
  // zaehlt als fehlende Einwilligung — nie als still uebersprungen. Sonst koennte ein
  // RLS-unsichtbarer Teilnehmer `allGranted` faelschlich true lassen (Caller-unabhaengig,
  // greift auch beim durchgereichten User-Client aus startMeeting).
  const returnedIds = new Set((contacts ?? []).map((c) => c.id));
  for (const id of contactIds) {
    if (!returnedIds.has(id)) {
      missing.push({
        id,
        first_name: "",
        last_name: "",
        email: "",
        consent_status: null,
      });
    }
  }

  return {
    allGranted: missing.length === 0,
    missing,
    granted,
  };
}
