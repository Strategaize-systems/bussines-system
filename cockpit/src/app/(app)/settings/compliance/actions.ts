"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  COMPLIANCE_TEMPLATE_DEFAULTS,
  COMPLIANCE_TEMPLATE_KEYS,
  type ComplianceTemplateKey,
} from "@/lib/compliance/consent-templates";

export type ComplianceTemplate = {
  template_key: ComplianceTemplateKey;
  body_markdown: string;
  default_body_markdown: string;
  updated_by: string | null;
  updated_at: string;
};

function isValidKey(key: string): key is ComplianceTemplateKey {
  return (COMPLIANCE_TEMPLATE_KEYS as string[]).includes(key);
}

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("Nicht authentifiziert");
  }
  return { supabase, user: auth.user };
}

/**
 * Liefert genau eine Compliance-Template-Zeile fuer den gegebenen Key.
 * Fallback (DB-Zeile fehlt): synthetische Antwort aus den Code-Defaults.
 */
export async function getComplianceTemplate(
  key: ComplianceTemplateKey,
): Promise<ComplianceTemplate> {
  if (!isValidKey(key)) throw new Error(`Unbekannter Template-Key: ${key}`);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("compliance_templates")
    .select("template_key, body_markdown, default_body_markdown, updated_by, updated_at")
    .eq("template_key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const fallback = COMPLIANCE_TEMPLATE_DEFAULTS[key];
    return {
      template_key: key,
      body_markdown: fallback,
      default_body_markdown: fallback,
      updated_by: null,
      updated_at: new Date(0).toISOString(),
    };
  }

  return data as ComplianceTemplate;
}

/**
 * Liefert alle 3 Compliance-Templates. Fehlende DB-Rows werden mit Code-Defaults aufgefuellt.
 */
export async function getAllComplianceTemplates(): Promise<ComplianceTemplate[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("compliance_templates")
    .select("template_key, body_markdown, default_body_markdown, updated_by, updated_at");

  if (error) throw new Error(error.message);

  const byKey = new Map<string, ComplianceTemplate>();
  for (const row of (data ?? []) as ComplianceTemplate[]) {
    byKey.set(row.template_key, row);
  }

  return COMPLIANCE_TEMPLATE_KEYS.map((key) => {
    const row = byKey.get(key);
    if (row) return row;
    const fallback = COMPLIANCE_TEMPLATE_DEFAULTS[key];
    return {
      template_key: key,
      body_markdown: fallback,
      default_body_markdown: fallback,
      updated_by: null,
      updated_at: new Date(0).toISOString(),
    };
  });
}

/**
 * Persistiert einen neuen Body fuer einen Template-Key. Setzt updated_by + updated_at.
 * Idempotent via UPSERT — falls die Zeile fehlt (Migration nicht gelaufen), wird sie
 * mit dem Code-Default als default_body_markdown angelegt.
 */
export async function updateComplianceTemplate(
  key: ComplianceTemplateKey,
  body: string,
): Promise<{ error: string }> {
  if (!isValidKey(key)) return { error: `Unbekannter Template-Key: ${key}` };
  if (typeof body !== "string") return { error: "Body muss ein String sein" };

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("compliance_templates").upsert(
    {
      template_key: key,
      body_markdown: body,
      default_body_markdown: COMPLIANCE_TEMPLATE_DEFAULTS[key],
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "template_key" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/compliance");
  return { error: "" };
}

/**
 * Setzt body_markdown auf default_body_markdown zurueck. Falls die DB-Zeile fehlt,
 * wird sie mit dem Code-Default neu angelegt.
 */
export async function resetComplianceTemplate(
  key: ComplianceTemplateKey,
): Promise<{ error: string }> {
  if (!isValidKey(key)) return { error: `Unbekannter Template-Key: ${key}` };
  const { supabase, user } = await requireUser();

  const codeDefault = COMPLIANCE_TEMPLATE_DEFAULTS[key];

  const { error } = await supabase.from("compliance_templates").upsert(
    {
      template_key: key,
      body_markdown: codeDefault,
      default_body_markdown: codeDefault,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "template_key" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/compliance");
  return { error: "" };
}
