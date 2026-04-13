"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EmailMessage, EmailThread, EmailClassification, EmailPriority } from "@/types/email";

// ------------------------------------------------------------------
// Types for UI
// ------------------------------------------------------------------

export interface InboxEmail extends EmailMessage {
  contact?: { id: string; first_name: string; last_name: string; email: string } | null;
  company?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

export interface InboxThread extends EmailThread {
  messages: InboxEmail[];
  contact?: { id: string; first_name: string; last_name: string; email: string } | null;
  company?: { id: string; name: string } | null;
}

// ------------------------------------------------------------------
// Inbox list (paginated)
// ------------------------------------------------------------------

export async function getInboxEmails(options?: {
  limit?: number;
  offset?: number;
  unassignedOnly?: boolean;
  search?: string;
}) {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("email_messages")
    .select(
      "*, contact:contacts!email_messages_contact_id_fkey(id, first_name, last_name, email), company:companies!email_messages_company_id_fkey(id, name), deal:deals!email_messages_deal_id_fkey(id, title)",
      { count: "exact" }
    )
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.unassignedOnly) {
    query = query.is("contact_id", null);
  }

  if (options?.search) {
    const q = `%${options.search}%`;
    query = query.or(`subject.ilike.${q},from_address.ilike.${q},from_name.ilike.${q}`);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { emails: (data ?? []) as InboxEmail[], total: count ?? 0 };
}

// ------------------------------------------------------------------
// Single email detail
// ------------------------------------------------------------------

export async function getEmailDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select(
      "*, contact:contacts!email_messages_contact_id_fkey(id, first_name, last_name, email), company:companies!email_messages_company_id_fkey(id, name), deal:deals!email_messages_deal_id_fkey(id, title)"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  // Mark as read
  if (!data.is_read) {
    await supabase.from("email_messages").update({ is_read: true }).eq("id", id);
  }

  return data as InboxEmail;
}

// ------------------------------------------------------------------
// Thread view
// ------------------------------------------------------------------

export async function getEmailThread(threadId: string) {
  const supabase = await createClient();

  const [threadResult, messagesResult] = await Promise.all([
    supabase.from("email_threads").select("*").eq("id", threadId).single(),
    supabase
      .from("email_messages")
      .select(
        "*, contact:contacts!email_messages_contact_id_fkey(id, first_name, last_name, email), company:companies!email_messages_company_id_fkey(id, name), deal:deals!email_messages_deal_id_fkey(id, title)"
      )
      .eq("thread_id", threadId)
      .order("received_at", { ascending: true }),
  ]);

  if (threadResult.error) throw new Error(threadResult.error.message);
  if (messagesResult.error) throw new Error(messagesResult.error.message);

  return {
    thread: threadResult.data as EmailThread,
    messages: (messagesResult.data ?? []) as InboxEmail[],
  };
}

// ------------------------------------------------------------------
// Assignment actions
// ------------------------------------------------------------------

export async function assignEmailToContact(emailId: string, contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({ contact_id: contactId })
    .eq("id", emailId);

  if (error) throw new Error(error.message);

  // Also update thread if exists
  const { data: email } = await supabase
    .from("email_messages")
    .select("thread_id")
    .eq("id", emailId)
    .single();

  if (email?.thread_id) {
    await supabase
      .from("email_threads")
      .update({ contact_id: contactId })
      .eq("id", email.thread_id);
  }

  revalidatePath("/emails");
  return { success: true };
}

export async function assignEmailToCompany(emailId: string, companyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({ company_id: companyId })
    .eq("id", emailId);

  if (error) throw new Error(error.message);
  revalidatePath("/emails");
  return { success: true };
}

export async function assignEmailToDeal(emailId: string, dealId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({ deal_id: dealId })
    .eq("id", emailId);

  if (error) throw new Error(error.message);
  revalidatePath("/emails");
  return { success: true };
}

// ------------------------------------------------------------------
// Mark read/unread
// ------------------------------------------------------------------

export async function markEmailRead(emailId: string, isRead: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({ is_read: isRead })
    .eq("id", emailId);

  if (error) throw new Error(error.message);
  revalidatePath("/emails");
  return { success: true };
}

// ------------------------------------------------------------------
// IMAP emails for timeline (contact/company/deal)
// ------------------------------------------------------------------

export async function getInboxEmailsForContact(contactId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("id, subject, from_address, from_name, received_at, is_read, body_text")
    .eq("contact_id", contactId)
    .order("received_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInboxEmailsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_messages")
    .select("id, subject, from_address, from_name, received_at, is_read, body_text")
    .eq("company_id", companyId)
    .order("received_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ------------------------------------------------------------------
// Contacts search (for assignment dropdown)
// ------------------------------------------------------------------

export async function searchContacts(query: string) {
  const supabase = await createClient();
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchDeals(query: string) {
  const supabase = await createClient();
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from("deals")
    .select("id, title")
    .ilike("title", q)
    .limit(10);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ------------------------------------------------------------------
// Manual reclassification
// ------------------------------------------------------------------

export async function reclassifyEmail(
  emailId: string,
  classification: EmailClassification,
  priority: EmailPriority
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_messages")
    .update({
      classification,
      priority,
      analyzed_at: new Date().toISOString(),
    })
    .eq("id", emailId);

  if (error) throw new Error(error.message);
  revalidatePath("/emails");
  return { success: true };
}
