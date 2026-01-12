# Spoosh

> Type-safe API client with composable plugins for TypeScript

Spoosh is a lightweight, type-safe API client framework with a unique plugin architecture. Build exactly what you need by composing plugins together.

## Features

**Type-Safe Routing** — Access your API with natural object syntax. Full autocomplete, zero magic strings.

```typescript
// Type-safe path and response types
const { data } = await client.api.posts[123].comments.$get();

// Type-safe dynamic params with function syntax
const { data } = await client.api.users(":userId").posts.$get({
  params: { userId: "123" }, // params is typed based on the path
});
```

**Automatic Cache Invalidation** — Tags are auto-generated from paths. Mutations automatically invalidate related queries.

```typescript
// Tags are generated from the path hierarchy:
// users.$get()           → tags: ["users"]
// users[123].$get()      → tags: ["users", "users/123"]
// users[123].posts.$get() → tags: ["users", "users/123", "users/123/posts"]

// When you create a post, related queries are auto-invalidated:
const { trigger } = useWrite((api) => api.users[123].posts.$post);
await trigger({ body: { title: "New Post" } });
// ✓ Automatically invalidates: users, users/123, users/123/posts
```

**Composable Plugin System** — Add only what you need. Each plugin is a separate package with its own types.

```typescript
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";

const plugins = [cachePlugin({ staleTime: 5000 }), retryPlugin({ retries: 3 })];
```

**Zero Boilerplate** — Define your schema once, get a fully typed client. No code generation required.

```typescript
import { createSpoosh, type Endpoint } from "@spoosh/core";

type ApiSchema = {
  posts: {
    $get: Endpoint<Post[]>;
    $post: Endpoint<Post, CreatePostBody>;
    _: { $get: Endpoint<Post> };
  };
};

const client = createSpoosh<ApiSchema>({ baseUrl: "/api" });
```

**Server Type Inference** — Use the Hono adapter for automatic client types from your server.

**OpenAPI Generation** — Generate OpenAPI 3.0 specs directly from your TypeScript types.

## Installation

```bash
npm install @spoosh/core
```

For React:

```bash
npm install @spoosh/core @spoosh/react
```

## Quick Start

```typescript
import { createSpoosh, type Endpoint } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";

type ApiSchema = {
  users: {
    $get: Endpoint<User[]>;
    _: { $get: Endpoint<User> };
  };
};

const plugins = [cachePlugin({ staleTime: 5000 })];

const client = createSpoosh<ApiSchema, Error, typeof plugins>({
  baseUrl: "/api",
  plugins,
});

// Fully typed API calls
const { data, error } = await client.api.users.$get();
const { data: user } = await client.api.users[123].$get();
```

### With React

```typescript
import { createReactSpoosh } from "@spoosh/react";

const { useRead, useWrite } = createReactSpoosh(client);

function UserList() {
  const { data, loading, error } = useRead((api) => api.users.$get());

  if (loading) return <div>Loading...</div>;
  return <ul>{data?.map((user) => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

## Packages

### Core

| Package                               | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| [@spoosh/core](./packages/core)       | Core client and plugin system                          |
| [@spoosh/react](./packages/react)     | React hooks (`useRead`, `useWrite`, `useInfiniteRead`) |
| [@spoosh/hono](./packages/hono)       | Hono type adapter for server-to-client type inference  |
| [@spoosh/openapi](./packages/openapi) | Generate OpenAPI specs from TypeScript types           |

### Plugins

| Plugin                                                          | Description                                          |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| [@spoosh/plugin-cache](./packages/plugin-cache)                 | Response caching with configurable stale time        |
| [@spoosh/plugin-retry](./packages/plugin-retry)                 | Automatic retry with configurable attempts and delay |
| [@spoosh/plugin-polling](./packages/plugin-polling)             | Auto-refresh data at intervals                       |
| [@spoosh/plugin-debounce](./packages/plugin-debounce)           | Debounce requests for search inputs                  |
| [@spoosh/plugin-throttle](./packages/plugin-throttle)           | Rate-limit request frequency                         |
| [@spoosh/plugin-deduplication](./packages/plugin-deduplication) | Prevent duplicate in-flight requests                 |
| [@spoosh/plugin-invalidation](./packages/plugin-invalidation)   | Auto-invalidate cache after mutations                |
| [@spoosh/plugin-optimistic](./packages/plugin-optimistic)       | Instant UI updates with automatic rollback           |
| [@spoosh/plugin-initial-data](./packages/plugin-initial-data)   | Show data immediately before fetch completes         |
| [@spoosh/plugin-refetch](./packages/plugin-refetch)             | Refetch on window focus or network reconnect         |
| [@spoosh/plugin-prefetch](./packages/plugin-prefetch)           | Preload data before it's needed                      |
| [@spoosh/plugin-nextjs](./packages/plugin-nextjs)               | Next.js server-side cache revalidation               |
| [@spoosh/plugin-debug](./packages/plugin-debug)                 | Debug logging for development                        |

## Plugin Usage

Plugins extend Spoosh's capabilities. Add them to your client configuration:

```typescript
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";

const plugins = [
  cachePlugin({ staleTime: 5000 }),
  retryPlugin({ retries: 3, retryDelay: 1000 }),
  deduplicationPlugin(),
];

const client = createSpoosh<ApiSchema, Error, typeof plugins>({
  baseUrl: "/api",
  plugins,
});
```

Per-request options are type-safe based on installed plugins:

```typescript
// These options are typed based on your plugins
useRead((api) => api.posts.$get(), {
  staleTime: 10000, // from plugin-cache
  retries: 5, // from plugin-retry
  pollingInterval: 3000, // from plugin-polling
});
```

## Creating Custom Plugins

Plugins are simple objects with middleware and lifecycle hooks:

```typescript
import type { SpooshPlugin } from "@spoosh/core";

interface MyPluginOptions {
  myOption?: string;
}

export function myPlugin(): SpooshPlugin<{
  readOptions: MyPluginOptions;
}> {
  return {
    name: "my:plugin",
    operations: ["read"],

    middleware: async (context, next) => {
      // Before request
      const response = await next();
      // After request
      return response;
    },

    lifecycle: {
      onMount(context) {
        /* Component mounted */
      },
      onUpdate(context, prev) {
        /* Options changed */
      },
      onUnmount(context) {
        /* Component unmounted */
      },
    },
  };
}
```

## License

MIT
