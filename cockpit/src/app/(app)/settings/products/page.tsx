import { listProducts, listProductCategories } from "@/app/actions/products";
import { ProductList } from "@/components/products/product-list";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    listProducts(),
    listProductCategories(),
  ]);

  return (
    <main className="px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Produkte</h1>
            <p className="text-sm text-muted-foreground">
              Produkte und Dienstleistungen verwalten
            </p>
          </div>
        </div>
        <ProductForm
          categories={categories}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neues Produkt
            </Button>
          }
        />
      </div>

      <ProductList products={products} categories={categories} />
    </main>
  );
}
