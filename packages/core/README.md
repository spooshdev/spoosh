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
import type {
  Endpoint,
  EndpointWithQuery,
  EndpointWithFormData,
} from "@spoosh/core";

type User = { id: number; name: string; email: string };

type ApiSchema = {
  users: {
    $get: User[]; // Simple form - just the return type
    $post: Endpoint<User, { name: string; email: string }>; // With body
    _: {
      $get: User;
      $put: Endpoint<User, Partial<User>>;
      $delete: void;
    };
  };
  search: {
    $get: EndpointWithQuery<User[], { q: string; page?: number }>;
  };
  upload: {
    $post: EndpointWithFormData<{ url: string }, { file: File }>;
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

// GET /api/users/123 (dynamic segment)
const { data: user } = await api.users[123].$get();

// Type-safe dynamic params with function syntax (recommended - params is typed)
const { data } = await api.users(":userId").$get({
  params: { userId: "123" },
});

// Alternative bracket syntaxes (less recommended):
// api.users[":userId"].$get() - works but no type inference for params
// api.users[userId].$get() - works with variable, no type inference

// PUT /api/users/123
const { data: updated } = await api.users[123].$put({
  body: { name: "John Updated" },
});

// DELETE /api/users/123
await api.users[123].$delete();

// POST with FormData
const { data: uploaded } = await api.upload.$post({
  formData: { file: myFile },
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
const { data: userPosts } = await api.users[123].posts.$get();
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

| Type                                 | Description                | Example                                                               |
| ------------------------------------ | -------------------------- | --------------------------------------------------------------------- |
| `TData`                              | Simple data type (no body) | `$get: User[]`                                                        |
| `Endpoint<TData>`                    | Explicit endpoint          | `$get: Endpoint<User[]>`                                              |
| `Endpoint<TData, TBody>`             | Endpoint with JSON body    | `$post: Endpoint<User, CreateUserBody>`                               |
| `EndpointWithQuery<TData, TQuery>`   | Endpoint with query params | `$get: EndpointWithQuery<User[], { page: number }>`                   |
| `EndpointWithFormData<TData, TForm>` | Endpoint with form data    | `$post: EndpointWithFormData<Result, { file: File }>`                 |
| `EndpointDefinition<T>`              | Full endpoint definition   | `$get: EndpointDefinition<{ data: User[]; query: { page: number } }>` |
| `_`                                  | Dynamic path segment       | `users: { _: { $get: User } }`                                        |

## API Reference

### createClient(config)

Creates a lightweight type-safe API client.

| Option           | Type                 | Description                                        |
| ---------------- | -------------------- | -------------------------------------------------- |
| `baseUrl`        | `string`             | Base URL for all API requests                      |
| `defaultOptions` | `RequestInit`        | Default fetch options (headers, credentials, etc.) |
| `middlewares`    | `SpooshMiddleware[]` | Request/response middlewares                       |

### createSpoosh(config)

Creates a full-featured client with plugin system. Use this with `@spoosh/react`.

| Option           | Type             | Description                   |
| ---------------- | ---------------- | ----------------------------- |
| `baseUrl`        | `string`         | Base URL for all API requests |
| `plugins`        | `SpooshPlugin[]` | Array of plugins to use       |
| `defaultOptions` | `RequestInit`    | Default fetch options         |

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
