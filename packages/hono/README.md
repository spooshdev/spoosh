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
import type { AppType } from "./server";

// Transform Hono app type to Spoosh schema
type ApiSchema = HonoToSpoosh<AppType>;

const spoosh = new Spoosh<ApiSchema, Error>("http://localhost:3000/api");

// Fully typed API calls
const { data: posts } = await spoosh.api("posts").GET();
// posts is typed as { id: number; title: string }[]

const { data: newPost } = await spoosh.api("posts").POST({
  body: { title: "New Post" },
});
// body is typed, newPost is { id: number; title: string }

// Dynamic segment with params
const { data: post } = await spoosh.api("posts/:id").GET({ params: { id: 1 } });
// post is typed as { id: number; title: string }

// With variable
const postId = 1;
const { data } = await spoosh.api("posts/:id").GET({ params: { id: postId } });
```

## Type Mapping

| Hono                          | Spoosh                           |
| ----------------------------- | -------------------------------- |
| `c.json(data)`                | Response data type               |
| `zValidator("json", schema)`  | Request body type                |
| `zValidator("query", schema)` | Query params type                |
| `zValidator("form", schema)`  | Form data type                   |
| `/posts/:id`                  | `"posts/:id"` (path with params) |

## API Reference

### HonoToSpoosh<T>

Type utility that transforms a Hono app type into Spoosh's ApiSchema format.

```typescript
import type { HonoToSpoosh } from "@spoosh/hono";
import type { AppType } from "./server";

type ApiSchema = HonoToSpoosh<AppType>;
```

**Supported HTTP methods:**

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`

**Path parameters:**

Dynamic segments (`:id`, `:slug`, etc.) are preserved in the path and accessed via the `params` option:

```typescript
// Hono route: /users/:userId/posts/:postId

// Access with params object
spoosh.api("users/:userId/posts/:postId").GET({
  params: { userId: 123, postId: 456 },
});

// With variables
const userId = 123;
const postId = 456;
spoosh.api("users/:userId/posts/:postId").GET({
  params: { userId, postId },
});
```

## Handling Large Apps (TS2589)

When your Hono app has many routes (20+), you may encounter TypeScript error TS2589: "Type instantiation is excessively deep and possibly infinite."

### Solution: Split-App Pattern

Instead of using `HonoToSpoosh` with your entire app type, split your routes into separate groups:

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

**3. Define schema using `HonoToSpoosh`:**

```typescript
// client.ts
import type { HonoToSpoosh } from "@spoosh/hono";
import type { usersRoutes } from "./routes/users";
import type { postsRoutes } from "./routes/posts";

// Pre-compute each route type separately (helps TypeScript caching)
type UsersSchema = HonoToSpoosh<typeof usersRoutes>;
type PostsSchema = HonoToSpoosh<typeof postsRoutes>;

// Merge schemas
type ApiSchema = UsersSchema & PostsSchema;
```

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

// Merge the types
type BookingsRoot = HonoToSpoosh<typeof bookingsRootRoutes>;
type BookingById = HonoToSpoosh<typeof bookingByIdRoutes>;

type ApiSchema = BookingsRoot & BookingById;
```

### Last Resort: `@ts-expect-error`

In rare cases, even after splitting routes, certain endpoints may still trigger TS2589. When this happens, you can use `@ts-expect-error` as a targeted workaround:

```typescript
// @ts-expect-error TS2589 - complex endpoint type
const { trigger } = useWrite((api) => api("bookings/:id/confirm").POST);
```

> **Note:** Only use `@ts-expect-error` for specific problematic endpoints, not as a blanket solution. The type safety still works at runtime—this just suppresses the compile-time error for that particular usage.
