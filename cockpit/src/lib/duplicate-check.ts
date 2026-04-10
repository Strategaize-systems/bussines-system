"use server";

import { createClient } from "@/lib/supabase/server";

export type DuplicateResult = {
  found: boolean;
  existingId: string | null;
  existingLabel: string | null;
};

/** Check if a contact with this email already exists */
export async function checkContactDuplicate(email: string): Promise<DuplicateResult> {
  if (!email || !email.includes("@")) return { found: false, existingId: null, existingLabel: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("email", email.toLowerCase().trim())
    .limit(1)
    .maybeSingle();

  if (!data) return { found: false, existingId: null, existingLabel: null };

  return {
    found: true,
    existingId: data.id,
    existingLabel: `${data.first_name} ${data.last_name}`,
  };
}

/** Check if a company with this name already exists */
export async function checkCompanyDuplicate(name: string): Promise<DuplicateResult> {
  if (!name || name.length < 2) return { found: false, existingId: null, existingLabel: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", name.trim())
    .limit(1)
    .maybeSingle();

  if (!data) return { found: false, existingId: null, existingLabel: null };

  return {
    found: true,
    existingId: data.id,
    existingLabel: data.name,
  };
}
