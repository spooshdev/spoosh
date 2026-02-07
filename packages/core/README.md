# @spoosh/core

Core client and plugin system for Spoosh - a type-safe API toolkit.

**[Documentation](https://spoosh.dev/docs/react)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/core
```

## Usage

### Define API Schema

```typescript
type User = { id: number; name: string; email: string };

type ApiSchema = {
  users: {
    GET: { data: User[] };
    POST: { data: User; body: { name: string; email: string } };
  };
  "users/:id": {
    GET: { data: User };
    PUT: { data: User; body: Partial<User> };
    DELETE: { data: void };
  };
  search: {
    GET: { data: User[]; query: { q: string; page?: number } };
  };
  upload: {
    POST: { data: { url: string }; body: { file: File } };
  };
  payments: {
    POST: {
      data: { id: string };
      body: { amount: number; currency: string };
    };
  };
};
```

### Create Client

```typescript
import { createClient } from "@spoosh/core";

const api = createClient<ApiSchema>("/api");

// With custom options
const apiWithAuth = createClient<ApiSchema>("/api", {
  headers: { Authorization: "Bearer token" },
});

// Import body wrappers for explicit serialization
import { json, form, urlencoded } from "@spoosh/core";
```

### Make API Calls

```typescript
// GET /api/users
const { data, error, status } = await api("users").GET();

// GET /api/search?q=john&page=1
const { data } = await api("search").GET({ query: { q: "john", page: 1 } });

// POST /api/users with JSON body
const { data: newUser } = await api("users").POST({
  body: { name: "John", email: "john@example.com" },
});

// GET /api/users/123 (with params)
const { data: user } = await api("users/:id").GET({ params: { id: 123 } });

// PUT /api/users/123
const userId = 123;
const { data: updated } = await api("users/:id").PUT({
  params: { id: userId },
  body: { name: "John Updated" },
});

// DELETE /api/users/123
await api("users/:id").DELETE({ params: { id: 123 } });

// POST with file upload (using form() wrapper for multipart/form-data)
const { data: uploaded } = await api("upload").POST({
  body: form({ file: myFile }),
});

// POST with form data (using urlencoded() wrapper)
const { data: payment } = await api("payments").POST({
  body: urlencoded({ amount: 1000, currency: "usd" }),
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

const api = createClient<ApiSchema>(process.env.API_URL!);

// Auto-generates next: { tags: ['posts'] }
const { data: posts } = await api("posts").GET();

// Auto-generates next: { tags: ['users', 'users/123', 'users/123/posts'] }
const { data: userPosts } = await api("users/:id/posts").GET({
  params: { id: 123 },
});
```

This enables automatic cache invalidation with `revalidateTag()` in Next.js.

## Schema Types

| Field   | Description           | Example                                          |
| ------- | --------------------- | ------------------------------------------------ |
| `data`  | Response data type    | `GET: { data: User[] }`                          |
| `body`  | Request body type     | `POST: { data: User; body: CreateUserBody }`     |
| `query` | Query parameters type | `GET: { data: User[]; query: { page: number } }` |
| `error` | Typed error type      | `GET: { data: User; error: ApiError }`           |

Path parameters are defined using `:param` syntax in the path key (e.g., `"users/:id"`).

## API Reference

### createClient(baseUrl, defaultOptions?)

Creates a lightweight type-safe API instance.

**Parameters:**

| Parameter        | Type          | Description                                                   |
| ---------------- | ------------- | ------------------------------------------------------------- |
| `baseUrl`        | `string`      | Base URL for all API requests                                 |
| `defaultOptions` | `RequestInit` | (Optional) Default fetch options (headers, credentials, etc.) |

### Spoosh (class)

Creates a full-featured client with plugin system using a clean class-based API. Use this with `@spoosh/react` or `@spoosh/angular`.

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";

const spoosh = new Spoosh<ApiSchema, Error>("/api", {
  headers: { Authorization: "Bearer token" },
}).use([cachePlugin({ staleTime: 5000 }), retryPlugin({ retries: 3 })]);

const { api } = client;
const { data } = await api("users").GET();
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

| Property          | Description                                 |
| ----------------- | ------------------------------------------- |
| `.api`            | Type-safe API interface for making requests |
| `.stateManager`   | Cache and state management                  |
| `.eventEmitter`   | Event system for refetch/invalidation       |
| `.pluginExecutor` | Plugin lifecycle management                 |

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
