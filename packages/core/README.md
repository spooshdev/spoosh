# enlace-core

Core fetch wrapper and type-safe API client for Enlace.

## Installation

```bash
npm install enlace-core
```

> **For React projects**, use [`enlace`](../enlace/README.md) instead for hooks and plugin system.

## Usage

### Basic Setup

```typescript
import { enlace } from "enlace-core";

const api = enlace("https://api.example.com");

const response = await api.users.$get();
if (response.error) {
  console.error(response.error);
  return;
}
console.log(response.data);
```

### Type-Safe Schema

Define your API schema for full type safety:

```typescript
import { enlace, Endpoint } from "enlace-core";

type ApiError = { message: string; code: number };

type ApiSchema = {
  users: {
    $get: User[];
    $post: Endpoint<User, CreateUser>;
    _: {
      $get: User;
      $put: Endpoint<User, UpdateUser>;
      $delete: void;
    };
  };
  posts: {
    $get: Post[];
    $post: Endpoint<Post, CreatePost, CustomError>;
  };
};

const api = enlace<ApiSchema, ApiError>("https://api.example.com");

// Fully typed
const users = await api.users.$get();
const user = await api.users[123].$get();
const newUser = await api.users.$post({ body: { name: "John" } });
```

### Schema Conventions

- `$get`, `$post`, `$put`, `$patch`, `$delete` — HTTP method endpoints
- `_` — Dynamic path segment (e.g., `/users/:id`)

```typescript
type Schema = {
  users: {
    $get: User[];                      // GET /users
    $post: Endpoint<User, CreateUser>; // POST /users
    _: {                               // /users/:id
      $get: User;                      // GET /users/:id
      $delete: void;                   // DELETE /users/:id
      profile: {
        $get: Profile;                 // GET /users/:id/profile
      };
    };
  };
};

// Usage
api.users.$get();              // GET /users
api.users[123].$get();         // GET /users/123
api.users[123].profile.$get(); // GET /users/123/profile
```

## Endpoint Types

### `Endpoint<TData, TBody?, TError?>`

For endpoints with JSON body:

```typescript
type ApiSchema = {
  posts: {
    $get: Post[];                                  // Direct type
    $post: Endpoint<Post, CreatePost>;             // Data + Body
    $put: Endpoint<Post, UpdatePost, CustomError>; // Data + Body + Error
    $delete: void;                                 // void response
  };
};
```

### `EndpointWithQuery<TData, TQuery, TError?>`

For endpoints with typed query parameters:

```typescript
import { EndpointWithQuery } from "enlace-core";

type ApiSchema = {
  users: {
    $get: EndpointWithQuery<User[], { page: number; limit: number; search?: string }>;
  };
};

// Usage - query params are fully typed
api.users.$get({ query: { page: 1, limit: 10 } });
```

### `EndpointWithFormData<TData, TFormData, TError?>`

For file uploads (multipart/form-data):

```typescript
import { EndpointWithFormData } from "enlace-core";

type ApiSchema = {
  uploads: {
    $post: EndpointWithFormData<Upload, { file: Blob | File; name: string }>;
  };
};

// Usage - formData is automatically converted
api.uploads.$post({
  formData: {
    file: selectedFile,
    name: "document.pdf",
  },
});
```

**FormData conversion rules:**

| Type                            | Conversion                    |
| ------------------------------- | ----------------------------- |
| `File` / `Blob`                 | Appended directly             |
| `string` / `number` / `boolean` | Converted to string           |
| `object` (nested)               | JSON stringified              |
| `array` of primitives           | Each item appended separately |
| `array` of files                | Each file appended            |
| `null` / `undefined`            | Skipped                       |

### `EndpointFull<T>`

Object-style for complex endpoints:

```typescript
import { EndpointFull } from "enlace-core";

type ApiSchema = {
  products: {
    $post: EndpointFull<{
      data: Product;
      body: CreateProduct;
      query: { categoryId: string };
      error: ValidationError;
    }>;
  };
};

api.products.$post({
  body: { name: "Widget" },
  query: { categoryId: "electronics" },
});
```

## API Reference

### `enlace<TSchema, TDefaultError>(baseUrl, options?)`

Creates a type-safe API client.

```typescript
const api = enlace<ApiSchema, ApiError>("https://api.example.com", {
  headers: {
    Authorization: "Bearer token",
  },
});
```

**Generic Parameters:**

- `TSchema` — API schema type defining endpoints
- `TDefaultError` — Default error type for all endpoints (default: `unknown`)

**Function Parameters:**

- `baseUrl` — Base URL for all requests
- `options` — Default options for all requests

### Request Options

```typescript
api.users.$post({
  body: { name: "John" },
  query: { include: "profile" },
  headers: { "X-Custom": "value" },
  cache: "no-store",
});
```

**Available options:**

- `body` — Request body (auto-serialized to JSON)
- `query` — Query parameters (auto-serialized)
- `formData` — FormData fields (auto-converted)
- `headers` — Request headers (merged with defaults)
- `cache` — Cache mode

### Async Headers

Headers can be static, sync, or async:

```typescript
// Static
const api = enlace("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
});

// Sync function
const api = enlace("https://api.example.com", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Async function
const api = enlace("https://api.example.com", {
  headers: async () => {
    const token = await getTokenFromStorage();
    return { Authorization: `Bearer ${token}` };
  },
});
```

### Response Type

All requests return `EnlaceResponse<TData, TError>`:

```typescript
type EnlaceResponse<TData, TError> =
  | { status: number; data: TData; error?: undefined }
  | { status: number; data?: undefined; error: TError };
```

**Usage with type narrowing:**

```typescript
const response = await api.users.$get();

if (response.error) {
  console.error(response.error); // typed as ApiError
  return;
}
console.log(response.data); // typed as User[]
```

## Features

### Relative URLs

In browser environments, relative URLs are automatically resolved:

```typescript
const api = enlace("/api");
// Resolves to: http://localhost:3000/api/...
```

### Auto JSON Serialization

Objects and arrays are automatically JSON-serialized:

```typescript
api.users.$post({
  body: { name: "John" }, // Automatically JSON.stringify'd
});
```

### Query Parameters

Query parameters are automatically serialized:

```typescript
api.posts.$get({
  query: { page: 1, limit: 10, active: true },
});
// GET /posts?page=1&limit=10&active=true
```

## Plugin System (Core)

The core package provides the plugin infrastructure used by `enlace` React hooks:

```typescript
import {
  createPluginExecutor,
  createStateManager,
  createEventEmitter,
  type EnlacePlugin,
} from "enlace-core";
```

### Plugin Lifecycle Handlers

Plugins can hook into these lifecycle points:

| Handler       | Description                          |
| ------------- | ------------------------------------ |
| `beforeFetch` | Before the request is made           |
| `afterFetch`  | After response is received           |
| `onSuccess`   | On successful response               |
| `onError`     | On error response                    |
| `onCacheHit`  | When cached data is found            |
| `onCacheMiss` | When no cached data exists           |
| `onMount`     | When the operation mounts (React)    |
| `onUnmount`   | When the operation unmounts (React)  |

### Creating Custom Plugins

```typescript
import type { EnlacePlugin, PluginContext } from "enlace-core";

type MyPluginConfig = {
  debug?: boolean;
};

type MyReadOptions = {
  customOption?: string;
};

export function myPlugin(
  config: MyPluginConfig = {}
): EnlacePlugin<MyReadOptions, object, object, object, object> {
  return {
    name: "my-plugin",
    operations: ["read", "write"],

    handlers: {
      beforeFetch(context: PluginContext) {
        if (config.debug) {
          console.log("Fetching:", context.queryKey);
        }
        return context;
      },

      onSuccess(context: PluginContext) {
        if (config.debug) {
          console.log("Success:", context.response?.data);
        }
        return context;
      },
    },
  };
}
```

### State Manager

Manages cache state for all queries:

```typescript
const stateManager = createStateManager();

// Create query key
const key = stateManager.createQueryKey({
  path: ["users"],
  method: "GET",
  options: { query: { page: 1 } },
});

// Get/set cache
const cached = stateManager.getCache(key);
stateManager.setCache(key, { state: { data: users }, tags: ["users"] });

// Subscribe to changes
const unsubscribe = stateManager.subscribeCache(key, () => {
  console.log("Cache updated");
});
```

### Event Emitter

Used for cross-component communication (e.g., cache invalidation):

```typescript
const eventEmitter = createEventEmitter();

// Subscribe to events
const unsubscribe = eventEmitter.on("invalidate", (tags: string[]) => {
  console.log("Invalidating tags:", tags);
});

// Emit events
eventEmitter.emit("invalidate", ["posts", "users"]);
```

## Exports

```typescript
// Client
export { enlace } from "./client";

// Types
export type {
  Endpoint,
  EndpointWithQuery,
  EndpointWithFormData,
  EndpointFull,
  EnlaceResponse,
  EnlaceOptions,
} from "./types";

// Plugin System
export { createPluginExecutor } from "./plugins/executor";
export { createStateManager } from "./state/manager";
export { createEventEmitter } from "./events/emitter";
export type { EnlacePlugin, PluginContext, PluginHandler } from "./plugins/types";

// Built-in Plugins
export {
  cachePlugin,
  retryPlugin,
  pollingPlugin,
  revalidationPlugin,
  optimisticPlugin,
  invalidationPlugin,
} from "./plugins/built-in";

// Utilities
export { generateTags } from "./utils/tags";
export { createOperationController } from "./operations/controller";
```

## License

MIT
