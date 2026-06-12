"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole } from "@/lib/auth/assert-role";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { findUnsafeMarkup } from "@/lib/legal/validate-markdown";

const MIN_CONTENT_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const DEFAULT_MD_PATH = "src/content/legal/customer-dse-default.md";

export type CustomerDseRow = {
  content_md: string;
  updated_at: string;
};

/**
 * Read the current customer-dse row scoped to the admin's team.
 * RLS-Policy `legal_documents_select_team` enforces tenant_team_id = get_my_team_id().
 */
export async function getCustomerDse(): Promise<CustomerDseRow | null> {
  const profile = await assertRole(["admin"]);
  if (!profile.team_id) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("content_md, updated_at")
    .eq("tenant_team_id", profile.team_id)
    .eq("kind", "customer-dse")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Persist a new customer-dse content_md. Validates length, writes audit_log.
 * RLS-Policy `legal_documents_admin_mutate` enforces is_admin() + tenant_team_id match.
 */
export async function updateCustomerDse(
  contentMd: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await assertNotReadOnlyContext();
  const profile = await assertRole(["admin"]);
  if (!profile.team_id) return { ok: false, error: "Kein Team zugeordnet" };

  if (typeof contentMd !== "string") {
    return { ok: false, error: "content_md muss ein String sein" };
  }
  if (contentMd.length < MIN_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `content_md zu kurz (min ${MIN_CONTENT_LENGTH} Zeichen)`,
    };
  }
  if (contentMd.length > MAX_CONTENT_LENGTH) {
    return {
      ok: false,
      error: `content_md zu lang (max ${MAX_CONTENT_LENGTH} Zeichen)`,
    };
  }

  // V8.14 SLC-912 MT-3 (ISSUE-100): Stored-XSS auf der public DSE-Page unterbinden.
  // Raw-<script>/Event-Handler/javascript:-URLs werden bereits beim Speichern
  // rejected (Defense-in-Depth zum Render-Sanitizer in renderLegalMarkdown).
  const unsafe = findUnsafeMarkup(contentMd);
  if (unsafe) {
    return {
      ok: false,
      error: `Unerlaubter HTML-/Script-Inhalt im Text: ${unsafe}`,
    };
  }

  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("legal_documents")
    .select("content_md")
    .eq("tenant_team_id", profile.team_id)
    .eq("kind", "customer-dse")
    .maybeSingle();

  const { error } = await supabase
    .from("legal_documents")
    .update({
      content_md: contentMd,
      updated_by: profile.user_id,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_team_id", profile.team_id)
    .eq("kind", "customer-dse");

  if (error) return { ok: false, error: error.message };

  // V8.11 SLC-904 (MIG-048): audit_log INSERT erfordert service_role.
  await createAdminClient().from("audit_log").insert({
    actor_id: profile.user_id,
    action: "customer_dse.updated",
    entity_type: "legal_document",
    entity_id: profile.team_id,
    context: "Customer-DSE editiert",
    changes: {
      old_length: previous?.content_md?.length ?? 0,
      new_length: contentMd.length,
    },
  });

  revalidatePath("/settings/compliance/customer-dse");
  return { ok: true };
}

/**
 * Reset content_md to the seed-default from customer-dse-default.md.
 * Writes audit_log with action customer_dse.reset.
 */
export async function resetCustomerDseToDefault(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await assertNotReadOnlyContext();
  const profile = await assertRole(["admin"]);
  if (!profile.team_id) return { ok: false, error: "Kein Team zugeordnet" };

  const defaultMd = await readFile(
    path.join(process.cwd(), DEFAULT_MD_PATH),
    "utf-8",
  );

  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("legal_documents")
    .select("content_md")
    .eq("tenant_team_id", profile.team_id)
    .eq("kind", "customer-dse")
    .maybeSingle();

  const { error } = await supabase
    .from("legal_documents")
    .update({
      content_md: defaultMd,
      updated_by: profile.user_id,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_team_id", profile.team_id)
    .eq("kind", "customer-dse");

  if (error) return { ok: false, error: error.message };

  // V8.11 SLC-904 (MIG-048): audit_log INSERT erfordert service_role.
  await createAdminClient().from("audit_log").insert({
    actor_id: profile.user_id,
    action: "customer_dse.reset",
    entity_type: "legal_document",
    entity_id: profile.team_id,
    context: "Customer-DSE auf Default zurueckgesetzt",
    changes: {
      old_length: previous?.content_md?.length ?? 0,
      new_length: defaultMd.length,
    },
  });

  revalidatePath("/settings/compliance/customer-dse");
  return { ok: true };
}
