"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// layout reserviert fuer V7+ Block-Builder (DEC-090). V5.3-Code ignoriert das Feld.
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
  is_system: boolean;
  category: string | null;
  language: string | null;
  layout: unknown;
};

export type TemplateFilter = "system" | "own" | "all";

const AVAILABLE_PLACEHOLDERS = [
  "{{vorname}}",
  "{{nachname}}",
  "{{firma}}",
  "{{position}}",
  "{{deal}}",
];

export async function getEmailTemplates(opts?: {
  filter?: TemplateFilter;
  category?: string;
}) {
  const supabase = await createClient();
  const filter = opts?.filter ?? "all";

  let query = supabase
    .from("email_templates")
    .select("*")
    .order("title", { ascending: true });

  if (filter === "system") {
    query = query.eq("is_system", true);
  } else if (filter === "own") {
    query = query.eq("is_system", false);
  }

  if (opts?.category) {
    query = query.eq("category", opts.category);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data as EmailTemplate[];
}

export async function createEmailTemplate(formData: FormData) {
  const supabase = await createClient();

  const language = (formData.get("language") as string) || "de";
  const category = (formData.get("category") as string) || null;

  const { error } = await supabase.from("email_templates").insert({
    title: formData.get("title") as string,
    subject_de: (formData.get("subject_de") as string) || null,
    subject_nl: (formData.get("subject_nl") as string) || null,
    subject_en: (formData.get("subject_en") as string) || null,
    body_de: (formData.get("body_de") as string) || null,
    body_nl: (formData.get("body_nl") as string) || null,
    body_en: (formData.get("body_en") as string) || null,
    placeholders: AVAILABLE_PLACEHOLDERS,
    is_system: false,
    category,
    language,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

export async function updateEmailTemplate(id: string, formData: FormData) {
  const supabase = await createClient();

  // Systemvorlagen duerfen nicht direkt editiert werden — der User soll
  // duplicateSystemTemplate() nutzen und dann die Kopie editieren.
  const { data: existing, error: fetchError } = await supabase
    .from("email_templates")
    .select("is_system")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (existing?.is_system) {
    return {
      error:
        "Systemvorlagen koennen nicht bearbeitet werden. Bitte zuerst duplizieren.",
    };
  }

  const updatePayload: Record<string, unknown> = {
    title: formData.get("title") as string,
    subject_de: (formData.get("subject_de") as string) || null,
    subject_nl: (formData.get("subject_nl") as string) || null,
    subject_en: (formData.get("subject_en") as string) || null,
    body_de: (formData.get("body_de") as string) || null,
    body_nl: (formData.get("body_nl") as string) || null,
    body_en: (formData.get("body_en") as string) || null,
  };

  const language = formData.get("language") as string | null;
  if (language) updatePayload.language = language;
  if (formData.has("category")) {
    updatePayload.category = (formData.get("category") as string) || null;
  }

  const { error } = await supabase
    .from("email_templates")
    .update(updatePayload)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

export async function deleteEmailTemplate(id: string) {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("email_templates")
    .select("is_system")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (existing?.is_system) {
    return {
      error: "Systemvorlagen koennen nicht geloescht werden.",
    };
  }

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: "" };
}

export async function duplicateSystemTemplate(id: string) {
  const supabase = await createClient();

  const { data: source, error: fetchError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) return { error: fetchError.message, id: null };
  if (!source) return { error: "Vorlage nicht gefunden", id: null };

  const { data: inserted, error: insertError } = await supabase
    .from("email_templates")
    .insert({
      title: `${source.title} (Kopie)`,
      subject_de: source.subject_de,
      subject_nl: source.subject_nl,
      subject_en: source.subject_en,
      body_de: source.body_de,
      body_nl: source.body_nl,
      body_en: source.body_en,
      placeholders: source.placeholders ?? AVAILABLE_PLACEHOLDERS,
      is_system: false,
      category: source.category,
      language: source.language ?? "de",
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message, id: null };

  revalidatePath("/settings");
  return { error: "", id: inserted?.id ?? null };
}
