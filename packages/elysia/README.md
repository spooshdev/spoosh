# @spoosh/elysia

Type adapter to convert [Elysia](https://elysiajs.com) app types to Spoosh's ApiSchema format.

**[Documentation](https://spoosh.dev/docs/integrations/elysia)** · **Requirements:** TypeScript >= 5.0

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
import type { ElysiaToSpoosh } from "@spoosh/elysia";
import type { App } from "./server";

// Transform Elysia app type to Spoosh schema
type ApiSchema = ElysiaToSpoosh<App>["api"];

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

| Elysia                   | Spoosh                           |
| ------------------------ | -------------------------------- |
| Return value             | Response data type               |
| `body: t.Object({...})`  | Request body type                |
| `query: t.Object({...})` | Query params type                |
| `/posts/:id`             | `"posts/:id"` (path with params) |

## API Reference

### ElysiaToSpoosh<T>

Type utility that transforms an Elysia app type into Spoosh's ApiSchema format.

```typescript
import type { ElysiaToSpoosh } from "@spoosh/elysia";
import type { App } from "./server";

type ApiSchema = ElysiaToSpoosh<App>["api"];
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
// Elysia route: /users/:userId/posts/:postId

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
type ApiSchema = ElysiaToSpoosh<App>["api"];
```
