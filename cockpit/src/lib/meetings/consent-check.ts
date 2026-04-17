// =============================================================
// Consent Check — Verify recording consent for meeting participants
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";

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
 */
export async function checkConsentStatus(
  contactIds: string[],
): Promise<ConsentCheckResult> {
  if (contactIds.length === 0) {
    return { allGranted: true, missing: [], granted: [] };
  }

  const admin = createAdminClient();
  const { data: contacts, error } = await admin
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

  return {
    allGranted: missing.length === 0,
    missing,
    granted,
  };
}
