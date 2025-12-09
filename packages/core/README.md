# enlace-core

Core fetch wrapper and type-safe API client for Enlace.

## Installation

```bash
npm install enlace-core
```

## Usage

### Basic Setup

```typescript
import { createEnlace } from "enlace-core";

const api = createEnlace("https://api.example.com");

// Make requests
const response = await api.users.get();
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

### Type-Safe Schema

Define your API schema for full type safety:

```typescript
import { createEnlace, Endpoint } from "enlace-core";

type ApiSchema = {
  users: {
    $get: Endpoint<User[], ApiError>;
    $post: Endpoint<User, ApiError, CreateUser>;
    _: {
      $get: Endpoint<User, NotFoundError>;
      $put: Endpoint<User, ApiError, UpdateUser>;
      $delete: Endpoint<void, ApiError>;
    };
  };
  posts: {
    $get: Endpoint<Post[], ApiError>;
  };
};

const api = createEnlace<ApiSchema>("https://api.example.com");

// Fully typed!
const users = await api.users.get();
const user = await api.users[123].get();
const newUser = await api.users.post({ body: { name: "John" } });
```

### Schema Conventions

- `$get`, `$post`, `$put`, `$patch`, `$delete` — HTTP method endpoints
- `_` — Dynamic path segment (e.g., `/users/:id`)

```typescript
type Schema = {
  users: {
    $get: Endpoint<User[], ApiError>;           // GET /users
    $post: Endpoint<User, ApiError>;            // POST /users
    _: {                                        // /users/:id
      $get: Endpoint<User, ApiError>;           // GET /users/:id
      profile: {
        $get: Endpoint<Profile, ApiError>;      // GET /users/:id/profile
      };
    };
  };
};

// Usage
api.users.get();              // GET /users
api.users[123].get();         // GET /users/123
api.users[123].profile.get(); // GET /users/123/profile
```

## API Reference

### `createEnlace<TSchema>(baseUrl, options?)`

Creates a type-safe API client.

```typescript
const api = createEnlace<ApiSchema>("https://api.example.com", {
  headers: {
    Authorization: "Bearer token",
  },
});
```

**Parameters:**
- `baseUrl` — Base URL for all requests (supports relative paths in browser)
- `options` — Default options for all requests

**Options:**
```typescript
type EnlaceOptions = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  cache?: RequestCache;
  // ...other fetch options
};
```

### Async Headers

Headers can be provided as a static value, sync function, or async function. This is useful when you need to fetch headers dynamically (e.g., auth tokens from async storage):

```typescript
// Static headers
const api = createEnlace("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
});

// Sync function
const api = createEnlace("https://api.example.com", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Async function
const api = createEnlace("https://api.example.com", {
  headers: async () => {
    const token = await getTokenFromStorage();
    return { Authorization: `Bearer ${token}` };
  },
});
```

This also works for per-request headers:

```typescript
api.users.get({
  headers: async () => {
    const token = await refreshToken();
    return { Authorization: `Bearer ${token}` };
  },
});
```

### Global Callbacks

You can set up global `onSuccess` and `onError` callbacks that are called for every request:

```typescript
const api = createEnlace<ApiSchema>("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
}, {
  onSuccess: (payload) => {
    console.log("Request succeeded:", payload.status, payload.data);
  },
  onError: (payload) => {
    if (payload.status === 0) {
      // Network error
      console.error("Network error:", payload.error.message);
    } else {
      // HTTP error
      console.error("HTTP error:", payload.status, payload.error);
    }
  },
});
```

**Callback Payloads:**

```typescript
// onSuccess payload
type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers: Headers;
};

// onError payload (HTTP error or network error)
type EnlaceErrorCallbackPayload<T> =
  | { status: number; error: T; headers: Headers }  // HTTP error
  | { status: 0; error: Error; headers: null };     // Network error
```

**Use cases:**
- Global error logging/reporting
- Toast notifications
- Authentication refresh on 401 errors
- Analytics tracking

### `Endpoint<TData, TError, TBody?>`

Type helper for defining endpoints:

```typescript
type Endpoint<TData, TError, TBody = never> = {
  data: TData;
  error: TError;
  body: TBody;
};
```

### Request Options

Per-request options:

```typescript
api.users.post({
  body: { name: "John" },
  query: { include: "profile" },
  headers: { "X-Custom": "value" },
  cache: "no-store",
});
```

**Available options:**
- `body` — Request body (auto-serialized to JSON for objects/arrays)
- `query` — Query parameters (auto-serialized)
- `headers` — Request headers (merged with defaults). Can be `HeadersInit` or `() => HeadersInit | Promise<HeadersInit>`
- `cache` — Cache mode

### Response Type

All requests return `EnlaceResponse<TData, TError>`:

```typescript
type EnlaceResponse<TData, TError> =
  | { ok: true; status: number; data: TData }
  | { ok: false; status: number; error: TError };
```

**Usage with type narrowing:**

```typescript
const response = await api.users.get();

if (response.ok) {
  // response.data is typed as User[]
  console.log(response.data);
} else {
  // response.error is typed as ApiError
  console.error(response.error);
}
```

## Features

### Relative URLs

In browser environments, relative URLs are automatically resolved:

```typescript
const api = createEnlace("/api");
// Resolves to: http://localhost:3000/api/...
```

### Auto JSON Serialization

Objects and arrays are automatically JSON-serialized:

```typescript
api.users.post({
  body: { name: "John" }, // Automatically JSON.stringify'd
});
```

### Query Parameters

Query parameters are automatically serialized:

```typescript
api.posts.get({
  query: {
    page: 1,
    limit: 10,
    active: true,
  },
});
// GET /posts?page=1&limit=10&active=true
```

## License

MIT
