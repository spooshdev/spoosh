# @spoosh/core

Core client and plugin system for Spoosh - a type-safe API client framework.

**[Documentation](https://spoosh.dev/docs)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/core
```

## Usage

### Define API Schema

```typescript
import type { Endpoint } from "@spoosh/core";

type User = { id: number; name: string; email: string };

type ApiSchema = {
  users: {
    $get: Endpoint<{ data: User[] }>;
    $post: Endpoint<{ data: User; body: { name: string; email: string } }>;
    _: {
      $get: Endpoint<{ data: User }>;
      $put: Endpoint<{ data: User; body: Partial<User> }>;
      $delete: void;
    };
  };
  search: {
    $get: Endpoint<{ data: User[]; query: { q: string; page?: number } }>;
  };
  upload: {
    $post: Endpoint<{ data: { url: string }; formData: { file: File } }>;
  };
  payments: {
    $post: Endpoint<{
      data: { id: string };
      urlEncoded: { amount: number; currency: string };
    }>;
  };
};
```

### Create Client

```typescript
import { createClient } from "@spoosh/core";

const api = createClient<ApiSchema>({
  baseUrl: "/api",
});
```

### Make API Calls

```typescript
// GET /api/users
const { data, error, status } = await api.users.$get();

// GET /api/search?q=john&page=1
const { data } = await api.search.$get({ query: { q: "john", page: 1 } });

// POST /api/users with JSON body
const { data: newUser } = await api.users.$post({
  body: { name: "John", email: "john@example.com" },
});

// GET /api/users/123 (direct usage - simplest)
const { data: user } = await api.users(123).$get();

// PUT /api/users/123 (with variable)
const userId = 123;
const { data: updated } = await api.users(userId).$put({
  body: { name: "John Updated" },
});

// DELETE /api/users/123
await api.users(123).$delete();

// Typed params (advanced - when you need explicit param names)
const { data } = await api.users(":userId").$get({
  params: { userId: 123 },
});

// POST with FormData
const { data: uploaded } = await api.upload.$post({
  formData: { file: myFile },
});

// POST with URL-encoded body (auto Content-Type: application/x-www-form-urlencoded)
const { data: payment } = await api.payments.$post({
  urlEncoded: { amount: 1000, currency: "usd" },
});
```

### Response Format

All API calls return a `SpooshResponse`:

```typescript
type SpooshResponse<TData, TError> = {
  status: number; // HTTP status code
  data: TData | undefined; // Response data (if successful)
  error: TError | undefined; // Error data (if failed)
  headers?: Headers; // Response headers
  aborted?: boolean; // True if request was aborted
};
```

### Next.js Server-Side Usage

When using `createClient`, Next.js cache tags are automatically generated from the API path:

```typescript
// Server component
import { createClient } from "@spoosh/core";

const api = createClient<ApiSchema>({ baseUrl: process.env.API_URL! });

// Auto-generates next: { tags: ['posts'] }
const { data: posts } = await api.posts.$get();

// Auto-generates next: { tags: ['users', 'users/123', 'users/123/posts'] }
const { data: userPosts } = await api.users(123).posts.$get();
```

This enables automatic cache invalidation with `revalidateTag()` in Next.js.

### With Middlewares

```typescript
import { createClient, createMiddleware } from "@spoosh/core";

const authMiddleware = createMiddleware("auth", "before", async (ctx) => {
  ctx.requestOptions = {
    ...ctx.requestOptions,
    headers: { Authorization: `Bearer ${token}` },
  };
  return ctx;
});

const api = createClient<ApiSchema>({
  baseUrl: "/api",
  middlewares: [authMiddleware],
});
```

### Middleware Utilities

```typescript
import {
  createMiddleware,
  applyMiddlewares,
  composeMiddlewares,
} from "@spoosh/core";

// createMiddleware(name, phase, handler) - Create a named middleware
const logMiddleware = createMiddleware("logger", "after", async (ctx) => {
  console.log(ctx.response?.status);
  return ctx;
});

// composeMiddlewares(...lists) - Combine multiple middleware arrays
const allMiddlewares = composeMiddlewares(
  [authMiddleware],
  [logMiddleware],
  conditionalMiddlewares
);

// applyMiddlewares(context, middlewares, phase) - Run middlewares for a phase
const updatedContext = await applyMiddlewares(context, middlewares, "before");
```

## Schema Types

| Type                             | Description                  | Example                                                             |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `Endpoint<{ data }>`             | Endpoint with data only      | `$get: Endpoint<{ data: User[] }>`                                  |
| `Endpoint<{ data; body }>`       | Endpoint with JSON body      | `$post: Endpoint<{ data: User; body: CreateUserBody }>`             |
| `Endpoint<{ data; query }>`      | Endpoint with query params   | `$get: Endpoint<{ data: User[]; query: { page: number } }>`         |
| `Endpoint<{ data; formData }>`   | Endpoint with multipart form | `$post: Endpoint<{ data: Result; formData: { file: File } }>`       |
| `Endpoint<{ data; urlEncoded }>` | Endpoint with URL-encoded    | `$post: Endpoint<{ data: Result; urlEncoded: { amount: number } }>` |
| `Endpoint<{ data; error }>`      | Endpoint with typed error    | `$get: Endpoint<{ data: User; error: ApiError }>`                   |
| `void`                           | No response body             | `$delete: void`                                                     |
| `_`                              | Dynamic path segment         | `users: { _: { $get: Endpoint<{ data: User }> } }`                  |

## API Reference

### createClient(config)

Creates a lightweight type-safe API client.

| Option           | Type                 | Description                                        |
| ---------------- | -------------------- | -------------------------------------------------- |
| `baseUrl`        | `string`             | Base URL for all API requests                      |
| `defaultOptions` | `RequestInit`        | Default fetch options (headers, credentials, etc.) |
| `middlewares`    | `SpooshMiddleware[]` | Request/response middlewares                       |

### Spoosh (class)

Creates a full-featured client with plugin system using a clean class-based API. Use this with `@spoosh/react`.

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";

const client = new Spoosh<ApiSchema, Error>("/api", {
  headers: { Authorization: "Bearer token" },
}).use([cachePlugin({ staleTime: 5000 }), retryPlugin({ retries: 3 })]);

const { api } = client;
const { data } = await api.users.$get();
```

**Constructor Parameters:**

| Parameter        | Type          | Description                      |
| ---------------- | ------------- | -------------------------------- |
| `baseUrl`        | `string`      | Base URL for all API requests    |
| `defaultOptions` | `RequestInit` | (Optional) Default fetch options |

**Methods:**

| Method          | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `.use(plugins)` | Add plugins to the client. Returns a new instance with updated types. |

**Properties:**

| Property          | Description                              |
| ----------------- | ---------------------------------------- |
| `.api`            | Type-safe API client for making requests |
| `.stateManager`   | Cache and state management               |
| `.eventEmitter`   | Event system for refetch/invalidation    |
| `.pluginExecutor` | Plugin lifecycle management              |

## Creating Plugins

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

    onResponse: async (context) => {
      // Handle response
      // This always run after response
    },

    lifecycle: {
      onMount(context) {},
      onUpdate(context, prev) {},
      onUnmount(context) {},
    },
  };
}
```
