"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { DealProduct } from "@/types/products";

// ── List ──────────────────────────────────────────────────────

export type DealProductWithName = DealProduct & {
  product_name: string;
  product_status: string;
  product_category: string | null;
};

export async function listDealProducts(
  dealId: string,
): Promise<DealProductWithName[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("deal_products")
    .select("*, products(name, status, category)")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });

  if (!data) return [];

  return data.map((dp: any) => ({
    id: dp.id,
    deal_id: dp.deal_id,
    product_id: dp.product_id,
    price: dp.price,
    quantity: dp.quantity,
    notes: dp.notes,
    created_at: dp.created_at,
    product_name: dp.products?.name ?? "Unbekannt",
    product_status: dp.products?.status ?? "active",
    product_category: dp.products?.category ?? null,
  }));
}

// ── Assign ────────────────────────────────────────────────────

export async function assignProduct(
  dealId: string,
  productId: string,
  price?: number,
  quantity?: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const admin = createAdminClient();
  const { error } = await admin.from("deal_products").insert({
    deal_id: dealId,
    product_id: productId,
    price: price ?? null,
    quantity: quantity ?? 1,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Dieses Produkt ist bereits zugeordnet" };
    }
    return { error: `Zuordnung fehlgeschlagen: ${error.message}` };
  }

  revalidatePath(`/deals/${dealId}`);
  return {};
}

// ── Update ────────────────────────────────────────────────────

export async function updateDealProduct(
  dealProductId: string,
  dealId: string,
  updates: { price?: number | null; quantity?: number; notes?: string | null },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("deal_products")
    .update(updates)
    .eq("id", dealProductId);

  if (error) {
    return { error: `Aktualisierung fehlgeschlagen: ${error.message}` };
  }

  revalidatePath(`/deals/${dealId}`);
  return {};
}

// ── Remove ────────────────────────────────────────────────────

export async function removeProduct(
  dealProductId: string,
  dealId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("deal_products")
    .delete()
    .eq("id", dealProductId);

  if (error) {
    return { error: `Entfernen fehlgeschlagen: ${error.message}` };
  }

  revalidatePath(`/deals/${dealId}`);
  return {};
}
