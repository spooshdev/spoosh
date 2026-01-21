# @spoosh/elysia

Type adapter to convert [Elysia](https://elysiajs.com) Eden Treaty client types to Spoosh's ApiSchema format.

**[Documentation](https://spoosh.dev/docs/integrations/elysia)** · **Requirements:** TypeScript >= 5.0

> **Note:** Eden Treaty does not enforce strict types for `body` properties. The object shape is preserved but property values are typed as `any` (e.g., `{ name: any }` instead of `{ name: string }`). Response and query types are fully preserved.

## Installation

```bash
npm install @spoosh/elysia
```

## Usage

### Server (Elysia)

```typescript
import { Elysia, t } from "elysia";

const app = new Elysia({ prefix: "/api" })
  .get("/posts", () => {
    return [
      { id: 1, title: "Hello World" },
      { id: 2, title: "Getting Started" },
    ];
  })
  .post(
    "/posts",
    ({ body }) => {
      return { id: 3, title: body.title };
    },
    {
      body: t.Object({ title: t.String() }),
    }
  )
  .get("/posts/:id", ({ params }) => {
    return { id: Number(params.id), title: "Post Title" };
  })
  .delete("/posts/:id", () => {
    return { success: true };
  });

// Export the app type for client usage
export type App = typeof app;
```

### Client (Spoosh)

```typescript
import { Spoosh } from "@spoosh/core";
import { treaty } from "@elysiajs/eden";
import type { ElysiaToSpoosh } from "@spoosh/elysia";
import type { App } from "./server";

// Transform Eden Treaty client type to Spoosh schema
type ApiSchema = ElysiaToSpoosh<ReturnType<typeof treaty<App>>>["api"];

const spoosh = new Spoosh<ApiSchema, Error>("http://localhost:3000/api");

// Fully typed API calls
const { data: posts } = await spoosh.posts.$get();
// posts is typed as { id: number; title: string }[]

const { data: newPost } = await spoosh.posts.$post({
  body: { title: "New Post" },
});
// body is typed, newPost is { id: number; title: string }

// Dynamic segment with direct usage (simplest)
const { data: post } = await spoosh.posts(1).$get();
// post is typed as { id: number; title: string }

// With variable
const postId = 1;
const { data } = await spoosh.posts(postId).$get();
```

## Type Mapping

| Elysia                   | Spoosh                      |
| ------------------------ | --------------------------- |
| Return value             | Response data type          |
| `body: t.Object({...})`  | Request body type           |
| `query: t.Object({...})` | Query params type           |
| `/posts/:id`             | `posts._` (dynamic segment) |

## API Reference

### ElysiaToSpoosh<T>

Type utility that transforms an Eden Treaty client type into Spoosh's ApiSchema format.

```typescript
import type { ElysiaToSpoosh } from "@spoosh/elysia";
import { treaty } from "@elysiajs/eden";
import type { App } from "./server";

type ApiSchema = ElysiaToSpoosh<ReturnType<typeof treaty<App>>>["api"];
```

**Supported HTTP methods:**

- `$get`
- `$post`
- `$put`
- `$patch`
- `$delete`

**Path parameters:**

Dynamic segments (`:id`, `:slug`, etc.) are converted to `_` in the schema and accessed via direct usage:

```typescript
// Elysia route: /users/:userId/posts/:postId

// Direct usage (simplest - pass values directly)
spoosh.users(123).posts(456).$get();

// With variables
const userId = 123;
const postId = 456;
spoosh.users(userId).posts(postId).$get();

// Typed params (advanced - explicit param names)
spoosh
  .users(":userId")
  .posts(":postId")
  .$get({
    params: { userId: 123, postId: 456 },
  });
```

## Split Routes

`ElysiaToSpoosh` works seamlessly with split routes using `.use()`:

```typescript
// routes/users.ts
export const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/", () => [])
  .post("/", ({ body }) => body, { body: t.Object({ name: t.String() }) })
  .get("/:id", ({ params }) => ({ id: params.id }));

// routes/posts.ts
export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get("/", () => [])
  .post("/", ({ body }) => body, { body: t.Object({ title: t.String() }) });

// app.ts
const app = new Elysia({ prefix: "/api" }).use(usersRoutes).use(postsRoutes);

export type App = typeof app;

// client.ts - types are correctly inferred
type ApiSchema = ElysiaToSpoosh<ReturnType<typeof treaty<App>>>["api"];
```
