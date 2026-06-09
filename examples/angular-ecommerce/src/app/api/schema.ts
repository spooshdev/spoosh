import type { SpooshSchema } from "@spoosh/core";

export type ApiError = {
  message: string;
  code?: string;
};

export type ProductRaw = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price_cents: number;
  rating_avg: number;
  likes_count: number;
  in_stock: boolean;
};

export type CommentRaw = {
  id: string;
  product_id: string;
  author_name: string;
  body: string;
  created_at: string;
  status?: "pending";
};

export type CartItemRaw = {
  id: string;
  product_id: string;
  title: string;
  image_url: string;
  quantity: number;
  price_cents: number;
};

export type OrderStatusRaw = {
  order_id: string;
  status: "processing" | "paid";
  updated_at: string;
};

export type ProductsQuery = {
  page?: number;
  q?: string;
};

export type CreateProductBody = {
  title: string;
  description?: string;
  price_cents: number;
  in_stock: boolean;
  image?: File;
};

export type ApiSchema = SpooshSchema<{
  products: {
    GET: {
      data: {
        items: ProductRaw[];
        page: number;
        total_pages: number;
        next_page: number | null;
        prev_page: number | null;
      };
      query: ProductsQuery;
    };
    POST: { data: ProductRaw; body: CreateProductBody };
  };
  "products/:id": {
    GET: { data: ProductRaw };
  };
  "products/:id/comments": {
    GET: { data: CommentRaw[] };
    POST: { data: CommentRaw; body: { body: string } };
  };
  "products/:id/like": {
    POST: { data: { likes_count: number } };
  };

  cart: {
    GET: { data: CartItemRaw[] };
    POST: { data: CartItemRaw; body: { product_id: string; quantity: number } };
  };
  "cart/:id": {
    DELETE: { data: { ok: true } };
  };

  checkout: {
    POST: {
      data: { order_id: string };
      body: { email: string; address: string };
    };
  };

  "orders/:id/status": {
    GET: { data: OrderStatusRaw };
  };
}>;
