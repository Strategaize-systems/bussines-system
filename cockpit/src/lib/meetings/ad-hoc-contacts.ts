// =============================================================
// Ad-hoc Contact Creation — Auto-create contacts for unknown emails (DEC-044)
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";

interface AdHocContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  consent_status: string | null;
  isNew: boolean;
}

/**
 * Ensure contacts exist for all given emails.
 * Returns existing contacts + newly created ad-hoc contacts.
 *
 * New contacts are created with:
 *   - consent_status = 'pending'
 *   - consent_source = 'ad_hoc'
 *   - display_name derived from email prefix
 */
export async function ensureContactsForEmails(
  emails: string[],
): Promise<AdHocContact[]> {
  if (emails.length === 0) return [];

  const admin = createAdminClient();
  const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

  // Find existing contacts by email
  const { data: existing, error: findError } = await admin
    .from("contacts")
    .select("id, email, first_name, last_name, consent_status")
    .in("email", normalizedEmails);

  if (findError) {
    throw new Error(`Kontakt-Suche fehlgeschlagen: ${findError.message}`);
  }

  const existingEmails = new Set((existing ?? []).map((c) => c.email?.toLowerCase()));
  const result: AdHocContact[] = (existing ?? []).map((c) => ({
    ...c,
    isNew: false,
  }));

  // Create missing contacts
  const missingEmails = normalizedEmails.filter((e) => !existingEmails.has(e));

  if (missingEmails.length > 0) {
    const newContacts = missingEmails.map((email) => {
      const prefix = email.split("@")[0] ?? email;
      return {
        email,
        first_name: prefix,
        last_name: "",
        consent_status: "pending",
        consent_source: "ad_hoc",
      };
    });

    const { data: inserted, error: insertError } = await admin
      .from("contacts")
      .insert(newContacts)
      .select("id, email, first_name, last_name, consent_status");

    if (insertError) {
      throw new Error(`Ad-hoc-Kontakt-Anlage fehlgeschlagen: ${insertError.message}`);
    }

    for (const c of inserted ?? []) {
      result.push({ ...c, isNew: true });
    }
  }

  return result;
}
