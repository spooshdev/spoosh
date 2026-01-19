# @spoosh/hono

Type adapter to convert [Hono](https://hono.dev) app types to Spoosh's ApiSchema format.

**[Documentation](https://spoosh.dev/docs/integrations/hono)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/hono
```

## Usage

### Server (Hono)

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono()
  .basePath("/api")
  .get("/posts", (c) => {
    return c.json([
      { id: 1, title: "Hello World" },
      { id: 2, title: "Getting Started" },
    ]);
  })
  .post("/posts", zValidator("json", z.object({ title: z.string() })), (c) => {
    const body = c.req.valid("json");
    return c.json({ id: 3, title: body.title });
  })
  .get("/posts/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ id: Number(id), title: "Post Title" });
  })
  .delete("/posts/:id", (c) => {
    return c.json({ success: true });
  });

// Export the app type for client usage
export type AppType = typeof app;
```

### Client (Spoosh)

```typescript
import { Spoosh } from "@spoosh/core";
import type { HonoToSpoosh } from "@spoosh/hono";
import type { hc } from "hono/client";
import type { AppType } from "./server";

// Transform Hono's hc client type to Spoosh schema
type ApiSchema = HonoToSpoosh<ReturnType<typeof hc<AppType>>>;

const spoosh = new Spoosh<ApiSchema, Error>("http://localhost:3000/api");

// Fully typed API calls
const { data: posts } = await spoosh.api.posts.$get();
// posts is typed as { id: number; title: string }[]

const { data: newPost } = await spoosh.api.posts.$post({
  body: { title: "New Post" },
});
// body is typed, newPost is { id: number; title: string }

const { data: post } = await spoosh.api.posts[1].$get();
// post is typed as { id: number; title: string }
```

## Type Mapping

| Hono                          | Spoosh                      |
| ----------------------------- | --------------------------- |
| `c.json(data)`                | Response data type          |
| `zValidator("json", schema)`  | Request body type           |
| `zValidator("query", schema)` | Query params type           |
| `zValidator("form", schema)`  | Form data type              |
| `/posts/:id`                  | `posts._` (dynamic segment) |

## API Reference

### HonoToSpoosh<T>

Type utility that transforms a Hono app type into Spoosh's ApiSchema format.

```typescript
import type { HonoToSpoosh } from "@spoosh/hono";

type ApiSchema = HonoToSpoosh<typeof app>;
```

**Supported HTTP methods:**

- `$get`
- `$post`
- `$put`
- `$patch`
- `$delete`

**Path parameters:**

Dynamic segments (`:id`, `:slug`, etc.) are converted to `_` in the schema:

```typescript
// Hono route: /users/:userId/posts/:postId
// Spoosh path: spoosh.api.users[userId].posts[postId].$get()
```

### HonoRouteToSpoosh<T>

Type utility for the split-app pattern. Use this when your app has many routes to avoid TS2589 errors.

```typescript
import type { HonoRouteToSpoosh } from "@spoosh/hono";
import type { hc } from "hono/client";
import type { usersRoutes } from "./routes/users";
import type { postsRoutes } from "./routes/posts";

type ApiSchema = {
  users: HonoRouteToSpoosh<ReturnType<typeof hc<typeof usersRoutes>>>;
  posts: HonoRouteToSpoosh<ReturnType<typeof hc<typeof postsRoutes>>>;
};
```

## Handling Large Apps (TS2589)

When your Hono app has many routes (20+), you may encounter TypeScript error TS2589: "Type instantiation is excessively deep and possibly infinite."

### Solution: Split-App Pattern

Instead of using `HonoToSpoosh` with your entire app type, split your routes into separate groups and use `HonoRouteToSpoosh` with the `hc` client type:

**1. Organize routes into separate files:**

```typescript
// routes/users.ts
export const usersRoutes = new Hono()
  .get("/", (c) => c.json([]))
  .post("/", (c) => c.json({}))
  .get("/:id", (c) => c.json({}));

// routes/posts.ts
export const postsRoutes = new Hono()
  .get("/", (c) => c.json([]))
  .post("/", (c) => c.json({}));
```

**2. Mount routes in your main app:**

```typescript
// app.ts
import { usersRoutes } from "./routes/users";
import { postsRoutes } from "./routes/posts";

const app = new Hono()
  .basePath("/api")
  .route("/users", usersRoutes)
  .route("/posts", postsRoutes);
```

**3. Define schema using `HonoRouteToSpoosh` with `hc` client types:**

```typescript
// client.ts
import type { HonoRouteToSpoosh } from "@spoosh/hono";
import type { hc } from "hono/client";
import type { usersRoutes } from "./routes/users";
import type { postsRoutes } from "./routes/posts";

// Pre-compute each route type separately (helps TypeScript caching)
type UsersSchema = HonoRouteToSpoosh<ReturnType<typeof hc<typeof usersRoutes>>>;
type PostsSchema = HonoRouteToSpoosh<ReturnType<typeof hc<typeof postsRoutes>>>;

type ApiSchema = {
  users: UsersSchema;
  posts: PostsSchema;
};
```

### Why use `hc` client types?

Using `typeof hc<typeof routes>` instead of `typeof app` is recommended because:

1. **Version stability**: The `hc` client type structure is more stable across Hono versions
2. **Isolated transformation**: Each route group is transformed independently, reducing type depth
3. **Better caching**: TypeScript can cache intermediate type computations more effectively

### Splitting Complex Route Groups

If a single route group is still causing TS2589, split it further:

```typescript
// Split by route pattern
const bookingsRootRoutes = new Hono()
  .get("/", (c) => c.json([]))
  .post("/", (c) => c.json({}));

const bookingByIdRoutes = new Hono()
  .get("/:id", (c) => c.json({}))
  .patch("/:id", (c) => c.json({}))
  .delete("/:id", (c) => c.json({}));

// In your schema, merge the types
type BookingsRoot = HonoRouteToSpoosh<ReturnType<typeof hc<typeof bookingsRootRoutes>>>;
type BookingById = HonoRouteToSpoosh<ReturnType<typeof hc<typeof bookingByIdRoutes>>>;

type ApiSchema = {
  bookings: BookingsRoot & BookingById;
};
```

### Last Resort: `@ts-expect-error`

In rare cases, even after splitting routes, certain endpoints may still trigger TS2589. When this happens, you can use `@ts-expect-error` as a targeted workaround:

```typescript
// @ts-expect-error TS2589 - complex endpoint type
const { trigger } = useWrite((api) => api.bookings(":id").confirm.$post);
```

> **Note:** Only use `@ts-expect-error` for specific problematic endpoints, not as a blanket solution. The type safety still works at runtime—this just suppresses the compile-time error for that particular usage.
