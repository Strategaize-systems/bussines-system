"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
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

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Save as draft if SMTP not configured
    const { error } = await supabase.from("emails").insert({
      contact_id: contactId,
      company_id: companyId,
      deal_id: dealId,
      direction: "outbound",
      from_address: fromAddress || null,
      to_address: toAddress,
      subject,
      body,
      status: "draft",
      follow_up_status: followUpDate ? "pending" : "none",
      follow_up_date: followUpDate,
    });

    if (error) return { error: error.message };

    revalidatePath("/emails");
    return { error: "", warning: "SMTP nicht konfiguriert — als Entwurf gespeichert." };
  }

  // Send via SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject,
      text: body,
    });
  } catch (err) {
    return { error: `SMTP-Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}` };
  }

  // Log sent email
  const { error } = await supabase.from("emails").insert({
    contact_id: contactId,
    company_id: companyId,
    deal_id: dealId,
    direction: "outbound",
    from_address: fromAddress,
    to_address: toAddress,
    subject,
    body,
    status: "sent",
    follow_up_status: followUpDate ? "pending" : "none",
    follow_up_date: followUpDate,
    sent_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

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
