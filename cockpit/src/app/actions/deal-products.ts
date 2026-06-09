"use server";

import { createClient } from "@/lib/supabase/server";
import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { revalidatePath } from "next/cache";
import type { DealProduct } from "@/types/products";

// V8.12 SLC-906 MT-2 (ISSUE-091): User-Client-Switch fuer alle 4 deal_products-
// Operations. RLS Klasse-C-Policy `deal_products_{select,insert,update,delete}`
// enforced `EXISTS(SELECT 1 FROM deals d WHERE d.id=deal_id AND
// can_see_owner(d.owner_user_id)) OR is_admin()` — Member kann eigene Deal-
// Products voll managen, fremde nicht. Kein createAdminClient mehr.

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

  const { data } = await supabase
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
  await assertNotReadOnlyContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { error } = await supabase.from("deal_products").insert({
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
  await assertNotReadOnlyContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { error } = await supabase
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
  await assertNotReadOnlyContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { error } = await supabase
    .from("deal_products")
    .delete()
    .eq("id", dealProductId);

  if (error) {
    return { error: `Entfernen fehlgeschlagen: ${error.message}` };
  }

  revalidatePath(`/deals/${dealId}`);
  return {};
}
