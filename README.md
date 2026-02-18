<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://spoosh.dev/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://spoosh.dev/assets/logo-light.svg">
    <img src="https://spoosh.dev/assets/logo-light.svg" alt="Spoosh Logo" width="50" height="44">
  </picture>
</p>

<h1 align="center">Spoosh</h1>

> Type-safe API toolkit with composable plugins for TypeScript

Spoosh is a lightweight, type-safe API toolkit with a unique plugin architecture. Build exactly what you need by composing plugins together.

**[Documentation](https://spoosh.dev)** · [Getting Started](https://spoosh.dev/docs/react/getting-started) · [Plugins](https://spoosh.dev/docs/react/plugins)

## Features

**Type-Safe Routing** — Access your API with natural object syntax. Full autocomplete, zero magic strings.

```typescript
// Direct usage with path strings
const { data } = await spoosh.api("users/:userId/posts").GET({
  params: { userId: 123 },
});
const { data } = await spoosh.api("posts/:postId/comments").GET({
  params: { postId: 456 },
});
```

**Automatic Cache Invalidation** — Tags are auto-generated from paths. Mutations automatically invalidate related queries.

```typescript
// Tags are generated from the path hierarchy:
// api("users").GET()                → tags: ["users"]
// api("users/:id").GET({...})       → tags: ["users", "users/:id"]
// api("users/:id/posts").GET({...}) → tags: ["users", "users/:id", "users/:id/posts"]

// When you create a post, related queries are auto-invalidated:
const { trigger } = useWrite((api) => api("users/:userId/posts").POST());
await trigger({ params: { userId: 123 }, body: { title: "New Post" } });
// ✓ Automatically invalidates: users, users/:userId, users/:userId/posts
```

**Composable Plugin System** — Add only what you need. Each plugin is a separate package with its own types.

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";

const spoosh = new Spoosh<ApiSchema, Error>('/api')
  .use([cachePlugin({ staleTime: 5000 }), retryPlugin({ retries: 3 })]);
```

**Zero Boilerplate** — Define your schema once, get a fully typed client. No code generation required.

```typescript
import { Spoosh } from "@spoosh/core";

type ApiSchema = {
  posts: {
    GET: { data: Post[] };
    POST: { data: Post; body: CreatePostBody };
  };
  "posts/:id": {
    GET: { data: Post };
  };
};

const spoosh = new Spoosh<ApiSchema, Error>("/api")
  .use([/* plugins */]);
```

**Server Type Inference** — Use the Hono or Elysia adapter for automatic client types from your server.

**OpenAPI Generation** — Generate OpenAPI 3.0 specs directly from your TypeScript types.

## Installation

```bash
npm install @spoosh/core
```

For React:

```bash
npm install @spoosh/core @spoosh/react
```

For Angular:

```bash
npm install @spoosh/core @spoosh/angular
```

## Quick Start

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";

type ApiSchema = {
  users: {
    GET: { data: User[] };
  };
  "users/:id": {
    GET: { data: User };
  };
};

const spoosh = new Spoosh<ApiSchema, Error>("/api")
  .use([cachePlugin({ staleTime: 5000 })]);

// Fully typed API calls
const { data, error } = await spoosh.api("users").GET();
const { data: user } = await spoosh.api("users/:id").GET({ params: { id: 123 } });
```

### With React

```typescript
import { create } from "@spoosh/react";

const { useRead, useWrite, useQueue } = create(spoosh);

function UserList() {
  const { data, loading, error } = useRead((api) => api("users").GET());

  if (loading) return <div>Loading...</div>;
  return <ul>{data?.map((user) => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### With Angular

```typescript
import { create } from "@spoosh/angular";

const { injectRead, injectWrite, injectQueue } = create(spoosh);

@Component({
  selector: 'app-user-list',
  template: `
    @if (loading()) {
      <div>Loading...</div>
    } @else {
      <ul>
        @for (user of data(); track user.id) {
          <li>{{ user.name }}</li>
        }
      </ul>
    }
  `
})
export class UserListComponent {
  private users = injectRead((api) => api("users").GET());

  data = this.users.data;
  loading = this.users.loading;
  error = this.users.error;
}
```

## Packages

### Core

| Package                               | Description                                            |
| ------------------------------------- | ------------------------------------------------------ |
| [@spoosh/core](./packages/core)       | Core client and plugin system                            |
| [@spoosh/react](./packages/react)     | React hooks (`useRead`, `useWrite`, `usePages`, `useQueue`)   |
| [@spoosh/angular](./packages/angular) | Angular signals (`injectRead`, `injectWrite`, `injectPages`, `injectQueue`) |
| [@spoosh/hono](./packages/hono)       | Hono type adapter for server-to-client type inference    |
| [@spoosh/elysia](./packages/elysia)   | Elysia type adapter for server-to-client type inference  |
| [@spoosh/openapi](./packages/openapi) | Generate OpenAPI specs from TypeScript types             |

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
| [@spoosh/plugin-transform](./packages/plugin-transform)         | Transform response data with sync/async functions    |
| [@spoosh/plugin-gc](./packages/plugin-gc)                       | Garbage collection for cache cleanup                 |
| [@spoosh/plugin-qs](./packages/plugin-qs)                       | Query string serialization with nested object support|
| [@spoosh/plugin-nextjs](./packages/plugin-nextjs)               | Next.js server-side cache revalidation               |
| [@spoosh/plugin-progress](./packages/plugin-progress)           | Upload/download progress tracking via XHR            |
| [@spoosh/devtool](./packages/devtool)                           | Visual debugging panel with request inspection       |

## Plugin Usage

Plugins extend Spoosh's capabilities. Add them using the `.use()` method:

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
  retryPlugin({ retries: 3, retryDelay: 1000 }),
  deduplicationPlugin(),
]);
```

Per-request options are type-safe based on installed plugins:

```typescript
// These options are typed based on your plugins
useRead((api) => api("posts").GET(), {
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
