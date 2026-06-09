"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { assertRole } from "@/lib/auth/assert-role";
import { revalidatePath } from "next/cache";
import type {
  Product,
  ProductStatus,
  CreateProductInput,
  UpdateProductInput,
} from "@/types/products";

// V8.12 SLC-906 MT-1 (ISSUE-090): Reads via User-Client (Klasse-B SELECT-Policy
// `products_select` USING (true) erlaubt allen authenticated). Writes ueber
// assertRole(["admin"]) + createAdminClient (Klasse-B INSERT/UPDATE/DELETE
// is_admin() bleibt als DB-Layer-Second-Line-of-Defense aktiv).

// ── List ──────────────────────────────────────────────────────

export async function listProducts(
  statusFilter?: ProductStatus | "all",
): Promise<Product[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  return (data as Product[]) ?? [];
}

// ── Distinct categories (for autocomplete) ────────────────────

export async function listProductCategories(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null)
    .order("category", { ascending: true });

  if (!data) return [];

  const unique = [...new Set(data.map((r) => r.category as string))];
  return unique;
}

// ── Create ────────────────────────────────────────────────────

export async function createProduct(
  input: CreateProductInput,
): Promise<{ error?: string; product?: Product }> {
  await assertNotReadOnlyContext();
  const profile = await assertRole(["admin"]);

  if (!input.name?.trim()) {
    return { error: "Name ist erforderlich" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      standard_price: input.standard_price ?? null,
      created_by: profile.user_id,
    })
    .select()
    .single();

  if (error) {
    return { error: `Produkt konnte nicht erstellt werden: ${error.message}` };
  }

  revalidatePath("/settings/products");
  return { product: data as Product };
}

// ── Update ────────────────────────────────────────────────────

export async function updateProduct(
  input: UpdateProductInput,
): Promise<{ error?: string; product?: Product }> {
  await assertNotReadOnlyContext();
  await assertRole(["admin"]);

  if (input.name !== undefined && !input.name.trim()) {
    return { error: "Name darf nicht leer sein" };
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.description !== undefined)
    updates.description = input.description.trim() || null;
  if (input.category !== undefined)
    updates.category = input.category.trim() || null;
  if (input.standard_price !== undefined)
    updates.standard_price = input.standard_price;
  if (input.status !== undefined) updates.status = input.status;

  const { data, error } = await admin
    .from("products")
    .update(updates)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    return { error: `Produkt konnte nicht aktualisiert werden: ${error.message}` };
  }

  revalidatePath("/settings/products");
  return { product: data as Product };
}

// ── Archive ───────────────────────────────────────────────────

export async function archiveProduct(
  productId: string,
): Promise<{ error?: string }> {
  await assertNotReadOnlyContext();
  await assertRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    return { error: `Produkt konnte nicht archiviert werden: ${error.message}` };
  }

  revalidatePath("/settings/products");
  return {};
}
