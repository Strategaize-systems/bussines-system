"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type {
  Product,
  ProductStatus,
  CreateProductInput,
  UpdateProductInput,
} from "@/types/products";

// ── List ──────────────────────────────────────────────────────

export async function listProducts(
  statusFilter?: ProductStatus | "all",
): Promise<Product[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  let query = admin
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

  const admin = createAdminClient();
  const { data } = await admin
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

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
      created_by: user.id,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

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
