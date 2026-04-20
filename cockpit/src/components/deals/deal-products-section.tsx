"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ProductSelect } from "@/components/products/product-select";
import {
  assignProduct,
  removeProduct,
  updateDealProduct,
} from "@/app/actions/deal-products";
import type { DealProductWithName } from "@/app/actions/deal-products";
import type { Product } from "@/types/products";

interface DealProductsSectionProps {
  dealId: string;
  dealProducts: DealProductWithName[];
  activeProducts: Product[];
}

export function DealProductsSection({
  dealId,
  dealProducts,
  activeProducts,
}: DealProductsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAssign(product: Product) {
    startTransition(async () => {
      await assignProduct(dealId, product.id, product.standard_price ?? undefined);
      router.refresh();
    });
  }

  function handleRemove(dealProductId: string) {
    startTransition(async () => {
      await removeProduct(dealProductId, dealId);
      router.refresh();
    });
  }

  function handlePriceChange(dealProductId: string, value: string) {
    const price = value ? parseFloat(value) : null;
    startTransition(async () => {
      await updateDealProduct(dealProductId, dealId, { price });
      router.refresh();
    });
  }

  function handleQuantityChange(dealProductId: string, value: string) {
    const quantity = parseInt(value) || 1;
    startTransition(async () => {
      await updateDealProduct(dealProductId, dealId, { quantity });
      router.refresh();
    });
  }

  const assignedIds = dealProducts.map((dp) => dp.product_id);

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#4454b8]">
        Produkte
      </p>

      {/* Assigned products */}
      {dealProducts.length > 0 ? (
        <div className="space-y-2">
          {dealProducts.map((dp) => (
            <DealProductRow
              key={dp.id}
              dp={dp}
              isPending={isPending}
              onPriceChange={handlePriceChange}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Keine Produkte zugeordnet</p>
      )}

      {/* Add product */}
      <ProductSelect
        products={activeProducts}
        excludeIds={assignedIds}
        onSelect={handleAssign}
      />
    </div>
  );
}

function DealProductRow({
  dp,
  isPending,
  onPriceChange,
  onQuantityChange,
  onRemove,
}: {
  dp: DealProductWithName;
  isPending: boolean;
  onPriceChange: (id: string, value: string) => void;
  onQuantityChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [price, setPrice] = useState(dp.price?.toString() ?? "");
  const [quantity, setQuantity] = useState(dp.quantity?.toString() ?? "1");
  const isInactive = dp.product_status !== "active";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${isInactive ? "text-slate-400" : "text-slate-900"}`}>
          {dp.product_name}
        </span>
        {isInactive && (
          <span className="ml-1.5 text-[10px] text-slate-400 font-medium">(inaktiv)</span>
        )}
        {dp.product_category && (
          <span className="ml-1.5 text-[10px] text-slate-400">{dp.product_category}</span>
        )}
      </div>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={() => onPriceChange(dp.id, price)}
        className="w-28 text-right text-sm tabular-nums"
        placeholder="Preis"
      />
      <span className="text-xs text-slate-400">EUR</span>
      <span className="text-xs text-slate-400 mx-1">&times;</span>
      <Input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onBlur={() => onQuantityChange(dp.id, quantity)}
        className="w-16 text-center text-sm"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        title="Zuordnung entfernen"
        disabled={isPending}
        onClick={() => onRemove(dp.id)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
