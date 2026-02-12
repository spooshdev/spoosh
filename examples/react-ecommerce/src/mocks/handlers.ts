import { delay, http, HttpResponse } from "msw";
import type {
  CartItemRaw,
  CommentRaw,
  OrderStatusRaw,
  ProductRaw,
} from "../lib/schema";

const PAGE_SIZE = 8;

const products: ProductRaw[] = Array.from({ length: 30 }, (_, index) => {
  const id = `${index + 1}`;
  return {
    id,
    title: `Premium Item ${id}`,
    description: `Designed for modern workflows with reliable quality and comfort. (${id})`,
    image_url: `https://picsum.photos/seed/spoosh-${id}/800/600`,
    price_cents: 2_500 + index * 370,
    rating_avg: 3.8 + (index % 10) * 0.11,
    likes_count: 8 + (index % 7) * 3,
    in_stock: index % 9 !== 0,
  };
});

const commentsByProduct = new Map<string, CommentRaw[]>();
for (const product of products) {
  commentsByProduct.set(product.id, [
    {
      id: `c-${product.id}-1`,
      product_id: product.id,
      author_name: "Avery",
      body: "Solid build and quick delivery.",
      created_at: new Date(Date.now() - 8_000_000).toISOString(),
    },
    {
      id: `c-${product.id}-2`,
      product_id: product.id,
      author_name: "Jordan",
      body: "Worth the price for daily use.",
      created_at: new Date(Date.now() - 3_500_000).toISOString(),
    },
  ]);
}

let cartItems: CartItemRaw[] = [
  {
    id: "cart-1",
    product_id: "2",
    title: products[1]?.title ?? "Premium Item 2",
    image_url: products[1]?.image_url ?? "",
    quantity: 1,
    price_cents: products[1]?.price_cents ?? 2_900,
  },
];

const orderPollCount = new Map<string, number>();
const outOfStockRetryCount = new Map<string, number>();
let nextProductId = 31;

function randomDelay() {
  return 300 + Math.floor(Math.random() * 300);
}

function findProduct(productId: string) {
  return products.find((product) => product.id === productId);
}

function cartId(productId: string) {
  return `cart-${productId}`;
}

export const handlers = [
  http.get("/api/products", async ({ request }) => {
    await delay(randomDelay());
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1") || 1;
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();

    const filtered = products.filter((product) => {
      if (!q) return true;
      return `${product.title} ${product.description}`
        .toLowerCase()
        .includes(q);
    });

    const start = (page - 1) * PAGE_SIZE;
    const items = filtered.slice(start, start + PAGE_SIZE);
    const next_page = start + PAGE_SIZE < filtered.length ? page + 1 : null;

    return HttpResponse.json({ items, next_page });
  }),

  http.get("/api/products/:id", async ({ params }) => {
    await delay(randomDelay());
    const productId = String(params.id);
    const product = findProduct(productId);

    if (!product) {
      return HttpResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    if (!product.in_stock) {
      const attempts = (outOfStockRetryCount.get(productId) ?? 0) + 1;
      outOfStockRetryCount.set(productId, attempts);

      if (attempts <= 2) {
        return HttpResponse.json(
          { message: "Service temporarily unavailable" },
          { status: 503 }
        );
      }
    }

    return HttpResponse.json(product);
  }),

  http.post("/api/products", async ({ request }) => {
    await delay(randomDelay());

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priceCents = Number(formData.get("price_cents")) || 0;
    const inStock = formData.get("in_stock") === "true";
    const image = formData.get("image") as File | null;

    if (!title || title.trim().length < 3) {
      return HttpResponse.json(
        { message: "Title must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (priceCents <= 0) {
      return HttpResponse.json(
        { message: "Price must be greater than 0" },
        { status: 400 }
      );
    }

    const id = String(nextProductId++);
    const newProduct: ProductRaw = {
      id,
      title: title.trim(),
      description: description?.trim() || "No description provided.",
      image_url: image
        ? URL.createObjectURL(image)
        : `https://picsum.photos/seed/spoosh-${id}/800/600`,
      price_cents: priceCents,
      rating_avg: 0,
      likes_count: 0,
      in_stock: inStock,
    };

    products.unshift(newProduct);

    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.get("/api/products/:id/comments", async ({ params }) => {
    await delay(randomDelay());
    return HttpResponse.json(commentsByProduct.get(String(params.id)) ?? []);
  }),

  http.post("/api/products/:id/comments", async ({ params, request }) => {
    await delay(randomDelay());
    const productId = String(params.id);
    const body = (await request.json()) as { body?: string };
    const content = body.body?.trim() ?? "";

    if (!content) {
      return HttpResponse.json(
        { message: "Comment cannot be empty" },
        { status: 422 }
      );
    }

    if (content.length < 3) {
      return HttpResponse.json(
        { message: "Comment must be at least 3 characters" },
        { status: 400 }
      );
    }

    const created: CommentRaw = {
      id: `c-${crypto.randomUUID()}`,
      product_id: productId,
      author_name: "You",
      body: content,
      created_at: new Date().toISOString(),
    };

    const current = commentsByProduct.get(productId) ?? [];
    commentsByProduct.set(productId, [created, ...current]);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/products/:id/like", async ({ params }) => {
    await delay(randomDelay());
    const product = findProduct(String(params.id));

    if (!product) {
      return HttpResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    product.likes_count += 1;
    return HttpResponse.json({ likes_count: product.likes_count });
  }),

  http.get("/api/cart", async () => {
    await delay(randomDelay());
    return HttpResponse.json(cartItems);
  }),

  http.post("/api/cart", async ({ request }) => {
    await delay(randomDelay());

    const body = (await request.json()) as {
      product_id: string;
      quantity: number;
    };
    const product = findProduct(body.product_id);

    if (!product) {
      return HttpResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    const existing = cartItems.find(
      (item) => item.product_id === body.product_id
    );
    if (existing) {
      existing.quantity += body.quantity;
      return HttpResponse.json(existing, { status: 201 });
    }

    const created: CartItemRaw = {
      id: cartId(product.id),
      product_id: product.id,
      title: product.title,
      image_url: product.image_url,
      quantity: body.quantity,
      price_cents: product.price_cents,
    };

    cartItems = [created, ...cartItems];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete("/api/cart/:id", async ({ params }) => {
    await delay(randomDelay());
    cartItems = cartItems.filter((item) => item.id !== String(params.id));
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/checkout", async ({ request }) => {
    await delay(randomDelay());
    const body = (await request.json()) as { email?: string; address?: string };

    if (!body.email || !body.address) {
      return HttpResponse.json(
        { message: "Missing checkout fields" },
        { status: 422 }
      );
    }

    const order_id = `ord-${crypto.randomUUID().slice(0, 8)}`;
    orderPollCount.set(order_id, 0);
    cartItems = [];

    return HttpResponse.json({ order_id }, { status: 201 });
  }),

  http.get("/api/orders/:id/status", async ({ params }) => {
    await delay(randomDelay());
    const orderId = String(params.id);

    const count = (orderPollCount.get(orderId) ?? 0) + 1;
    orderPollCount.set(orderId, count);

    const payload: OrderStatusRaw = {
      order_id: orderId,
      status: count >= 3 ? "paid" : "processing",
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(payload);
  }),
];
