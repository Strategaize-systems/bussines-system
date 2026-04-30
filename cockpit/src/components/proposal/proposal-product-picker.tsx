"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addProposalItem, type ProposalItem } from "@/app/(app)/proposals/actions";
import type { Product } from "@/types/products";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type ProposalProductPickerProps = {
  proposalId: string;
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (item: ProposalItem) => void;
};

export function ProposalProductPicker({
  proposalId,
  products,
  open,
  onOpenChange,
  onAdded,
}: ProposalProductPickerProps) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [products, query]);

  function handleSelect(product: Product) {
    setError(null);
    setPendingId(product.id);
    startTransition(async () => {
      const res = await addProposalItem(proposalId, product.id, 1);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAdded(res.item);
      onOpenChange(false);
      setQuery("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Produkt hinzufuegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              autoFocus
              placeholder="Produkt suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {error && (
            <div className="rounded-md border-2 border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto rounded-lg border-2 border-slate-200 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {query
                  ? `Keine Produkte fuer "${query}"`
                  : "Keine aktiven Produkte vorhanden"}
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors disabled:cursor-wait disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {p.name}
                    </div>
                    {p.category && (
                      <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                        {p.category}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-700 tabular-nums shrink-0">
                    {p.standard_price != null
                      ? eur.format(p.standard_price)
                      : "—"}
                  </div>
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {pendingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
