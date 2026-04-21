"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Manually assign an inbound email to a contact (FEAT-505, Stufe 3)
 */
export async function assignEmailToContact(emailId: string, contactId: string) {
  const supabase = await createClient();

  // Get contact's company_id for co-assignment
  const { data: contact } = await supabase
    .from("contacts")
    .select("company_id")
    .eq("id", contactId)
    .single();

  const { error } = await supabase
    .from("email_messages")
    .update({
      contact_id: contactId,
      company_id: contact?.company_id ?? null,
      assignment_source: "manual",
    })
    .eq("id", emailId);

  if (error) return { error: error.message };

  revalidatePath("/emails/unassigned");
  revalidatePath("/emails");
  return { error: "" };
}

/**
 * Dismiss an unassigned email (mark as spam/newsletter to remove from queue)
 */
export async function dismissUnassignedEmail(emailId: string, classification: "spam" | "newsletter") {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_messages")
    .update({ classification })
    .eq("id", emailId);

  if (error) return { error: error.message };

  revalidatePath("/emails/unassigned");
  revalidatePath("/emails");
  return { error: "" };
}

/**
 * Get all contacts for the assignment dropdown
 */
export async function getContactsForAssignment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, companies(name)")
    .order("last_name", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`,
    email: c.email,
    company: (c.companies as unknown as { name: string } | null)?.name ?? null,
  }));
}

/**
 * Get unassigned email count for badge display
 */
export async function getUnassignedEmailCount() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("email_messages")
    .select("id", { count: "exact", head: true })
    .is("contact_id", null)
    .not("classification", "in", '("spam","newsletter","auto_reply")');

  if (error) return 0;
  return count ?? 0;
}
