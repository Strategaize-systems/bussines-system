"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EmailTemplate = {
  id: string;
  title: string;
  subject_de: string | null;
  subject_nl: string | null;
  subject_en: string | null;
  body_de: string | null;
  body_nl: string | null;
  body_en: string | null;
  placeholders: string[];
  created_at: string;
};

const AVAILABLE_PLACEHOLDERS = [
  "{{vorname}}",
  "{{nachname}}",
  "{{firma}}",
  "{{position}}",
  "{{deal}}",
];

export async function getEmailTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return data as EmailTemplate[];
}

export async function createEmailTemplate(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("email_templates").insert({
    title: formData.get("title") as string,
    subject_de: (formData.get("subject_de") as string) || null,
    subject_nl: (formData.get("subject_nl") as string) || null,
    subject_en: (formData.get("subject_en") as string) || null,
    body_de: (formData.get("body_de") as string) || null,
    body_nl: (formData.get("body_nl") as string) || null,
    body_en: (formData.get("body_en") as string) || null,
    placeholders: AVAILABLE_PLACEHOLDERS,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

export async function updateEmailTemplate(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_templates")
    .update({
      title: formData.get("title") as string,
      subject_de: (formData.get("subject_de") as string) || null,
      subject_nl: (formData.get("subject_nl") as string) || null,
      subject_en: (formData.get("subject_en") as string) || null,
      body_de: (formData.get("body_de") as string) || null,
      body_nl: (formData.get("body_nl") as string) || null,
      body_en: (formData.get("body_en") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

export async function deleteEmailTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

