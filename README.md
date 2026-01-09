# Enlace

> **Enlace** (Spanish: /enˈla.se/) — _link, connection, bond_

The missing link between your API schema and your UI.

## Philosophy

APIs are structured. Your code should reflect that structure.

Enlace takes a different approach to data fetching. Instead of treating API calls as disconnected fetch operations, Enlace models your entire API as a navigable type-safe object. Your API paths become your code paths.

```typescript
// Your API structure IS your code structure
api.users[userId].posts.$get();
api.teams[teamId].members[memberId].$delete();
```

No route strings. No path templates. No runtime typos. Just types, all the way down.

## Core Ideas

**Schema-First** — Define your API shape once. TypeScript infers the rest.

**Proxy Navigation** — Navigate your API like a file system. Paths are validated at compile time.

**Plugin Architecture** — Compose behavior with plugins: caching, polling, retries, optimistic updates, and more.

**Zero Configuration Caching** — Cache tags are derived from URL structure automatically. `GET /posts/123` caches under `['posts', 'posts/123']`. Mutations to `/posts` invalidate what they should.

**Framework Native** — First-class React hooks. Native Next.js cache integration with ISR and server revalidation.

## Packages

| Package                                | Description                                   |
| -------------------------------------- | --------------------------------------------- |
| [`enlace-core`](./packages/core)       | Core fetch wrapper and type-safe API client   |
| [`enlace`](./packages/enlace)          | React hooks with plugin system                |
| [`enlace-openapi`](./packages/openapi) | Generate OpenAPI specs from TypeScript schema |
| [`enlace-hono`](./packages/hono)       | Type adapter for Hono framework               |

## Installation

```bash
# For React projects
npm install enlace

# For vanilla JS/TS (no React)
npm install enlace-core
```

## Quick Start

### Define Your Schema

```typescript
import { Endpoint } from "enlace";

type ApiError = { message: string; code: number };

type ApiSchema = {
  posts: {
    $get: Post[];
    $post: Endpoint<Post, CreatePost>;
    _: {
      $get: Post;
      $put: Endpoint<Post, UpdatePost>;
      $delete: void;
    };
  };
  users: {
    _: {
      $get: User;
      posts: {
        $get: Post[];
      };
    };
  };
};
```

### Create Your Hooks with Plugins

```typescript
import {
  enlaceHooks,
  cachePlugin,
  retryPlugin,
  pollingPlugin,
  revalidationPlugin,
  optimisticPlugin,
  invalidationPlugin,
} from "enlace";

const plugins = [
  cachePlugin({ staleTime: 5000 }),
  retryPlugin({ retries: 3, retryDelay: 1000 }),
  pollingPlugin(),
  revalidationPlugin({ revalidateOnFocus: true, revalidateOnReconnect: true }),
  optimisticPlugin(),
  invalidationPlugin(),
] as const;

const { useRead, useWrite, useInfiniteRead } = enlaceHooks<ApiSchema, ApiError>()({
  baseUrl: "https://api.example.com",
  plugins,
});
```

### Read Data

```typescript
function PostList() {
  const { data, loading, error } = useRead((api) => api.posts.$get());

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Write Data with Auto-Invalidation

```typescript
function CreatePost() {
  const { trigger, loading } = useWrite((api) => api.posts.$post);

  const handleSubmit = async (title: string) => {
    await trigger({ body: { title } });
    // Cache for 'posts' is automatically invalidated
  };

  return (
    <button onClick={() => handleSubmit("New Post")} disabled={loading}>
      Create
    </button>
  );
}
```

### Dynamic Routes

```typescript
function UserPosts({ userId }: { userId: string }) {
  const { data } = useRead((api) => api.users[userId].posts.$get());
  // Cache tags: ['users', 'users/:userId', 'users/:userId/posts']

  return <PostList posts={data} />;
}
```

## Plugin System

Enlace uses a composable plugin architecture. Each plugin adds specific functionality:

| Plugin               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `cachePlugin`        | Response caching with stale time control         |
| `retryPlugin`        | Automatic retry with exponential backoff         |
| `pollingPlugin`      | Periodic refetching at configurable intervals    |
| `revalidationPlugin` | Revalidate on focus, reconnect, or invalidation  |
| `optimisticPlugin`   | Optimistic UI updates with automatic rollback    |
| `invalidationPlugin` | Tag-based cache invalidation after mutations     |
| `nextjsPlugin`       | Next.js server-side revalidation integration     |

### Plugin Configuration

```typescript
const plugins = [
  cachePlugin({ staleTime: 60000 }),
  retryPlugin({ retries: 3, retryDelay: 1000 }),
  pollingPlugin(),
  revalidationPlugin({
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  }),
  optimisticPlugin(),
  invalidationPlugin({ autoInvalidate: "all" }),
] as const;
```

### Next.js Integration

```typescript
// actions.ts
"use server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function serverRevalidator(tags: string[], paths: string[]) {
  tags.forEach((tag) => revalidateTag(tag));
  paths.forEach((path) => revalidatePath(path));
}
```

```typescript
// hooks.ts
import {
  enlaceHooks,
  cachePlugin,
  invalidationPlugin,
  nextjsPlugin,
} from "enlace";
import { serverRevalidator } from "./actions";

const plugins = [
  cachePlugin({ staleTime: 60000 }),
  invalidationPlugin(),
  nextjsPlugin({ serverRevalidator }),
] as const;

export const { useRead, useWrite } = enlaceHooks<ApiSchema, ApiError>()({
  baseUrl: "https://api.example.com",
  plugins,
});
```

## Documentation

- [enlace-core](./packages/core/README.md) — Core API client
- [enlace](./packages/enlace/README.md) — React hooks with plugins
- [enlace-openapi](./packages/openapi/README.md) — OpenAPI generation
- [enlace-hono](./packages/hono/README.md) — Hono type adapter

## License

MIT
