"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProduct, updateProduct } from "@/app/actions/products";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/products";

interface ProductFormProps {
  product?: Product;
  categories: string[];
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function ProductForm({
  product,
  categories,
  trigger,
  onSuccess,
}: ProductFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [standardPrice, setStandardPrice] = useState(
    product?.standard_price?.toString() ?? "",
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const categoryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setCategory(product?.category ?? "");
      setStandardPrice(product?.standard_price?.toString() ?? "");
      setError("");
    }
  }, [open, product]);

  const filteredCategories = categories.filter(
    (c) =>
      c.toLowerCase().includes(category.toLowerCase()) &&
      c.toLowerCase() !== category.toLowerCase(),
  );

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      if (product) {
        const input: UpdateProductInput = {
          id: product.id,
          name,
          description,
          category,
          standard_price: standardPrice ? parseFloat(standardPrice) : undefined,
        };
        const result = await updateProduct(input);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const input: CreateProductInput = {
          name,
          description: description || undefined,
          category: category || undefined,
          standard_price: standardPrice ? parseFloat(standardPrice) : undefined,
        };
        const result = await createProduct(input);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setOpen(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product ? "Produkt bearbeiten" : "Neues Produkt"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="product-name">Name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Blueprint Classic"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="product-description">Beschreibung</Label>
            <Input
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung"
            />
          </div>

          <div className="relative">
            <Label htmlFor="product-category">Kategorie</Label>
            <Input
              id="product-category"
              ref={categoryRef}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="z.B. Beratung, Workshop"
              autoComplete="off"
            />
            {showSuggestions && filteredCategories.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                {filteredCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCategory(c);
                      setShowSuggestions(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="product-price">Richtpreis (EUR)</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={standardPrice}
              onChange={(e) => setStandardPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Speichern..."
              : product
                ? "Aktualisieren"
                : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
