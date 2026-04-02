"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Referral = {
  id: string;
  referrer_id: string | null;
  referred_contact_id: string | null;
  referred_company_id: string | null;
  deal_id: string | null;
  referral_date: string | null;
  quality: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  referrer?: { id: string; first_name: string; last_name: string } | null;
  referred_contact?: { id: string; first_name: string; last_name: string } | null;
  referred_company?: { id: string; name: string } | null;
  deals?: { id: string; title: string } | null;
};

export async function getReferrals() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .select(`
      *,
      referrer:contacts!referrer_id(id, first_name, last_name),
      referred_contact:contacts!referred_contact_id(id, first_name, last_name),
      referred_company:companies!referred_company_id(id, name),
      deals(id, title)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Referral[];
}

export async function getReferralsByReferrer(referrerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .select(`
      *,
      referred_contact:contacts!referred_contact_id(id, first_name, last_name),
      referred_company:companies!referred_company_id(id, name),
      deals(id, title)
    `)
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createReferral(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("referrals").insert({
    referrer_id: (formData.get("referrer_id") as string) || null,
    referred_contact_id: (formData.get("referred_contact_id") as string) || null,
    referred_company_id: (formData.get("referred_company_id") as string) || null,
    deal_id: (formData.get("deal_id") as string) || null,
    referral_date: (formData.get("referral_date") as string) || new Date().toISOString().split("T")[0],
    quality: (formData.get("quality") as string) || null,
    outcome: (formData.get("outcome") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/referrals");
  revalidatePath("/multiplikatoren");
  return { error: "" };
}

export async function deleteReferral(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("referrals").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/referrals");
  return { error: "" };
}
