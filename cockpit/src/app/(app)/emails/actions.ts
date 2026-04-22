"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmailWithTracking } from "@/lib/email/send";
import { createFollowUpTask } from "@/app/(app)/aufgaben/actions";

export type Email = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  direction: string;
  from_address: string | null;
  to_address: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  follow_up_status: string;
  follow_up_date: string | null;
  template_used: string | null;
  tracking_id: string | null;
  sent_at: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name: string; email: string | null } | null;
  companies?: { id: string; name: string } | null;
};

export async function getEmails() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("*, contacts(id, first_name, last_name, email), companies(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Email[];
}

export async function getEmailsForContact(contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Email[];
}

export async function getEmailsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Email[];
}

export async function sendEmail(formData: FormData) {
  const supabase = await createClient();

  const toAddress = formData.get("to_address") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;
  const dealId = (formData.get("deal_id") as string) || null;
  const followUpDate = (formData.get("follow_up_date") as string) || null;

  // Send via Shared Email-Send-Layer (DEC-069)
  const result = await sendEmailWithTracking({
    to: toAddress,
    subject,
    body,
    contactId,
    companyId,
    dealId,
    followUpDate,
  });

  if (!result.success) {
    return { error: result.error || "Unbekannter Fehler" };
  }

  // Auto-create follow-up task when follow_up_date is set
  if (followUpDate) {
    const contactName = contactId
      ? await getContactName(supabase, contactId)
      : null;
    await createFollowUpTask({
      title: contactName
        ? `Follow-up: ${contactName} (${subject})`
        : `Follow-up: ${subject}`,
      description: `Automatische Wiedervorlage nach E-Mail "${subject}"`,
      due_date: followUpDate,
      contact_id: contactId,
      company_id: companyId,
      deal_id: dealId,
    });
  }

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/emails");

  if (result.warning) {
    return { error: "", warning: result.warning };
  }
  return { error: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getContactName(supabase: any, contactId: string): Promise<string | null> {
  const { data } = await supabase
    .from("contacts")
    .select("first_name, last_name")
    .eq("id", contactId)
    .single();
  if (!data) return null;
  return `${data.first_name} ${data.last_name}`;
}

export async function updateFollowUpStatus(id: string, status: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("emails")
    .update({ follow_up_status: status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/emails");
  return { error: "" };
}

export async function deleteEmail(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("emails").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/emails");
  return { error: "" };
}
