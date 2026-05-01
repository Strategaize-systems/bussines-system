"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { PaymentTermsTemplate } from "@/types/proposal-payment";

const TABLE = "payment_terms_templates";
const MAX_LABEL_LENGTH = 100;
const MIN_BODY_LENGTH = 1;

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht authentifiziert");
  return { supabase, user: auth.user };
}

function validateInput(label: string, body: string): string | null {
  const trimmedLabel = label?.trim() ?? "";
  const trimmedBody = body?.trim() ?? "";
  if (trimmedLabel.length === 0) return "Bezeichnung darf nicht leer sein";
  if (trimmedLabel.length > MAX_LABEL_LENGTH)
    return `Bezeichnung zu lang (max ${MAX_LABEL_LENGTH} Zeichen)`;
  if (trimmedBody.length < MIN_BODY_LENGTH) return "Text darf nicht leer sein";
  return null;
}

/**
 * Liste aller Templates, Default zuerst, danach alphabetisch.
 */
export async function listPaymentTermsTemplates(): Promise<
  PaymentTermsTemplate[]
> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, label, body, is_default, created_at, updated_at")
    .order("is_default", { ascending: false })
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentTermsTemplate[];
}

export async function createPaymentTermsTemplate(input: {
  label: string;
  body: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const validationError = validateInput(input.label, input.body);
  if (validationError) return { ok: false, error: validationError };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      label: input.label.trim(),
      body: input.body.trim(),
      is_default: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "create",
    entityType: "payment_terms_template",
    entityId: data.id,
    changes: { after: { label: input.label.trim(), body: input.body.trim() } },
  });

  revalidatePath("/settings/payment-terms");
  return { ok: true, id: data.id };
}

export async function updatePaymentTermsTemplate(input: {
  id: string;
  label: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const validationError = validateInput(input.label, input.body);
  if (validationError) return { ok: false, error: validationError };

  const { data: before, error: readError } = await supabase
    .from(TABLE)
    .select("label, body")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!before) return { ok: false, error: "Vorlage nicht gefunden" };

  const { error } = await supabase
    .from(TABLE)
    .update({
      label: input.label.trim(),
      body: input.body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "update",
    entityType: "payment_terms_template",
    entityId: input.id,
    changes: {
      before,
      after: { label: input.label.trim(), body: input.body.trim() },
    },
  });

  revalidatePath("/settings/payment-terms");
  return { ok: true };
}

export async function deletePaymentTermsTemplate(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  const { data: row, error: readError } = await supabase
    .from(TABLE)
    .select("id, label, body, is_default")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!row) return { ok: false, error: "Vorlage nicht gefunden" };

  if (row.is_default) {
    return {
      ok: false,
      error: "Setze zuerst ein anderes Template als Default",
    };
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  void logAudit({
    action: "delete",
    entityType: "payment_terms_template",
    entityId: input.id,
    changes: { before: { label: row.label, body: row.body } },
  });

  revalidatePath("/settings/payment-terms");
  return { ok: true };
}

/**
 * Default-Switch: erst alle false, dann gewuenschte Row true. Sequenziell,
 * weil UNIQUE-Index auf (is_default) WHERE is_default=true bei parallelen
 * Calls einen sauberen Constraint-Violation produziert (Defense-in-Depth).
 */
export async function setDefaultPaymentTermsTemplate(input: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();

  const { data: target, error: readError } = await supabase
    .from(TABLE)
    .select("id, label, is_default")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!target) return { ok: false, error: "Vorlage nicht gefunden" };
  if (target.is_default) return { ok: true };

  const { error: clearError } = await supabase
    .from(TABLE)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("is_default", true);

  if (clearError) return { ok: false, error: clearError.message };

  const { error: setError } = await supabase
    .from(TABLE)
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", input.id);

  if (setError) return { ok: false, error: setError.message };

  void logAudit({
    action: "update",
    entityType: "payment_terms_template",
    entityId: input.id,
    changes: { after: { is_default: true } },
    context: "Set as default payment-terms template",
  });

  revalidatePath("/settings/payment-terms");
  return { ok: true };
}
