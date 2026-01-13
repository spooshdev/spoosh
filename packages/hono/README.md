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
import { createSpoosh } from "@spoosh/core";
import type { HonoToSpoosh } from "@spoosh/hono";
import type { AppType } from "./server";

// Transform Hono's type to Spoosh schema
type ApiSchema = HonoToSpoosh<AppType>;

const client = createSpoosh<ApiSchema>({
  baseUrl: "http://localhost:3000/api",
});

// Fully typed API calls
const { data: posts } = await client.api.posts.$get();
// posts is typed as { id: number; title: string }[]

const { data: newPost } = await client.api.posts.$post({
  body: { title: "New Post" },
});
// body is typed, newPost is { id: number; title: string }

const { data: post } = await client.api.posts[1].$get();
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
// Spoosh path: client.api.users[userId].posts[postId].$get()
```
