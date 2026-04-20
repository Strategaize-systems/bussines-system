export type ProductStatus = "active" | "inactive" | "archived";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  standard_price: number | null;
  status: ProductStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  category?: string;
  standard_price?: number;
};

export type UpdateProductInput = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  standard_price?: number;
  status?: ProductStatus;
};

export type DealProduct = {
  id: string;
  deal_id: string;
  product_id: string;
  price: number | null;
  quantity: number;
  notes: string | null;
  created_at: string;
};
