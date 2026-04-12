import { SupabaseClient } from "@supabase/supabase-js";

export interface ContactMatch {
  contactId: string;
  companyId: string | null;
  dealId: string | null;
}

/**
 * Match an email address against known contacts.
 * Strategy: exact email match → domain match (skip public domains) → null
 */
export async function matchContact(
  supabase: SupabaseClient,
  fromAddress: string
): Promise<ContactMatch | null> {
  if (!fromAddress) return null;

  const normalized = fromAddress.toLowerCase().trim();

  // 1. Exact email match
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, company_id")
    .eq("email", normalized)
    .limit(1)
    .maybeSingle();

  if (contact) {
    const dealId = contact.company_id
      ? await findActiveDeal(supabase, contact.company_id)
      : null;

    return {
      contactId: contact.id,
      companyId: contact.company_id,
      dealId,
    };
  }

  // 2. Domain match — find a contact with same email domain
  const domain = normalized.split("@")[1];
  if (!domain || isPublicDomain(domain)) return null;

  const { data: domainContact } = await supabase
    .from("contacts")
    .select("id, company_id")
    .ilike("email", `%@${domain}`)
    .not("company_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (domainContact) {
    const dealId = domainContact.company_id
      ? await findActiveDeal(supabase, domainContact.company_id)
      : null;

    return {
      contactId: domainContact.id,
      companyId: domainContact.company_id,
      dealId,
    };
  }

  return null;
}

async function findActiveDeal(
  supabase: SupabaseClient,
  companyId: string
): Promise<string | null> {
  const { data: deal } = await supabase
    .from("deals")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return deal?.id ?? null;
}

const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.de",
  "hotmail.com",
  "outlook.com",
  "outlook.de",
  "live.com",
  "live.de",
  "web.de",
  "gmx.de",
  "gmx.net",
  "gmx.at",
  "gmx.ch",
  "t-online.de",
  "freenet.de",
  "posteo.de",
  "mailbox.org",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
]);

function isPublicDomain(domain: string): boolean {
  return PUBLIC_DOMAINS.has(domain);
}
