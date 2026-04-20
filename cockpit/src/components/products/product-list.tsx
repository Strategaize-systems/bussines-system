"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import { archiveProduct, updateProduct } from "@/app/actions/products";
import { ProductForm } from "./product-form";
import type { Product, ProductStatus } from "@/types/products";

interface ProductListProps {
  products: Product[];
  categories: string[];
}

const statusLabels: Record<ProductStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
};

const statusColors: Record<ProductStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-amber-100 text-amber-700 border-amber-200",
  archived: "bg-slate-100 text-slate-400 border-slate-200",
};

export function ProductList({ products, categories }: ProductListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "all"
      ? products
      : products.filter((p) => p.status === filter);

  function handleArchive(productId: string) {
    startTransition(async () => {
      await archiveProduct(productId);
      router.refresh();
    });
  }

  function handleReactivate(productId: string) {
    startTransition(async () => {
      await updateProduct({ id: productId, status: "active" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "active", "inactive", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "Alle" : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead className="text-right">Richtpreis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                  Keine Produkte gefunden
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-slate-900">
                    {product.name}
                    {product.description && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {product.category || "—"}
                  </TableCell>
                  <TableCell className="text-right text-slate-600 tabular-nums">
                    {product.standard_price != null
                      ? `${product.standard_price.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${statusColors[product.status]}`}
                    >
                      {statusLabels[product.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ProductForm
                        product={product}
                        categories={categories}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Bearbeiten">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                        onSuccess={() => router.refresh()}
                      />
                      {product.status !== "archived" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Archivieren"
                          disabled={isPending}
                          onClick={() => handleArchive(product.id)}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reaktivieren"
                          disabled={isPending}
                          onClick={() => handleReactivate(product.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
