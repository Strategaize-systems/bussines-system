"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";

export type Signal = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  activity_id: string | null;
  signal_type: string;
  description: string | null;
  created_at: string;
};

export async function getSignals(params: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("signals")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.contactId) query = query.eq("contact_id", params.contactId);
  if (params.companyId) query = query.eq("company_id", params.companyId);
  if (params.dealId) query = query.eq("deal_id", params.dealId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Signal[];
}

export async function createSignal(formData: FormData) {
  await assertNotReadOnlyContext();

  const supabase = await createClient();

  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;
  const dealId = (formData.get("deal_id") as string) || null;

  const { error } = await supabase.from("signals").insert({
    contact_id: contactId,
    company_id: companyId,
    deal_id: dealId,
    signal_type: formData.get("signal_type") as string,
    description: (formData.get("description") as string) || null,
  });

  if (error) return { error: error.message };

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (companyId) revalidatePath(`/companies/${companyId}`);
  return { error: "" };
}

export async function createSignalForActivity(
  activityId: string,
  contactId: string | null,
  companyId: string | null,
  signalType: string
) {
  await assertNotReadOnlyContext();

  const supabase = await createClient();

  const { error } = await supabase.from("signals").insert({
    activity_id: activityId,
    contact_id: contactId,
    company_id: companyId,
    signal_type: signalType,
  });

  if (error) {
    // ISSUE-140: rohe RLS-Fehlermeldung (42501) durch klare Meldung ersetzen;
    // andere Fehler behalten ihr Detail.
    const message =
      error.code === "42501"
        ? "Signal konnte nicht gespeichert werden: fehlende Berechtigung fuer einen verknuepften Datensatz."
        : `Signal konnte nicht gespeichert werden: ${error.message}`;
    return { error: message };
  }

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (companyId) revalidatePath(`/companies/${companyId}`);
  return { error: "" };
}

export async function deleteSignal(id: string) {
  await assertNotReadOnlyContext();

  const supabase = await createClient();
  const { error } = await supabase.from("signals").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/companies");
  return { error: "" };
}
