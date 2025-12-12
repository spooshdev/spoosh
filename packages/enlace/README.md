# enlace

Type-safe API client with React hooks and Next.js integration.

## Installation

```bash
npm install enlace
```

## Quick Start

```typescript
import { createEnlaceHookReact } from "enlace/hook";
import { Endpoint } from "enlace";

// Define your API error type
type ApiError = { message: string; code: number };

type ApiSchema = {
  posts: {
    $get: Post[]; // Simple: just data type
    $post: Endpoint<Post, CreatePost>; // Data + Body
    $put: Endpoint<Post, UpdatePost, CustomError>; // Data + Body + Custom Error
    _: {
      $get: Post; // Simple: just data type
      $delete: void; // Simple: void response
    };
  };
};

// Pass global error type as second generic
const useAPI = createEnlaceHookReact<ApiSchema, ApiError>(
  "https://api.example.com"
);
```

## Schema Conventions

Defining a schema is **recommended** for full type safety, but **optional**. You can go without types:

```typescript
// Without schema (untyped, but still works!)
const useAPI = createEnlaceHookReact("https://api.example.com");
const { data } = useAPI((api) => api.any.path.you.want.get());
```

```typescript
// With schema (recommended for type safety)
const useAPI = createEnlaceHookReact<ApiSchema>("https://api.example.com");
```

### Schema Structure

- `$get`, `$post`, `$put`, `$patch`, `$delete` — HTTP method endpoints
- `_` — Dynamic path segment (e.g., `/users/:id`)

```typescript
import { Endpoint } from "enlace";

type ApiError = { message: string };

type ApiSchema = {
  users: {
    $get: User[]; // GET /users (simple)
    $post: Endpoint<User, CreateUser>; // POST /users with body
    _: {
      // /users/:id
      $get: User; // GET /users/:id (simple)
      $put: Endpoint<User, UpdateUser>; // PUT /users/:id with body
      $delete: void; // DELETE /users/:id (void response)
      profile: {
        $get: Profile; // GET /users/:id/profile (simple)
      };
    };
  };
};

// Pass global error type - applies to all endpoints
const api = createEnlace<ApiSchema, ApiError>("https://api.example.com");

// Usage
api.users.get(); // GET /users
api.users[123].get(); // GET /users/123
api.users[123].profile.get(); // GET /users/123/profile
```

### Endpoint Types

The `Endpoint` type helpers let you define response data, request body, query params, formData, and error types.

#### `Endpoint<TData, TBody?, TError?>`

For endpoints with JSON body:

```typescript
import { Endpoint } from "enlace";

type ApiSchema = {
  posts: {
    $get: Post[];                                   // Direct type (simplest)
    $post: Endpoint<Post, CreatePost>;              // Data + Body
    $put: Endpoint<Post, UpdatePost, ValidationError>; // Data + Body + Error
    $delete: void;                                  // void response
    $patch: Endpoint<Post, never, NotFoundError>;   // Custom error without body
  };
};
```

#### `EndpointWithQuery<TData, TQuery, TError?>`

For endpoints with typed query parameters:

```typescript
import { EndpointWithQuery } from "enlace";

type ApiSchema = {
  users: {
    $get: EndpointWithQuery<User[], { page: number; limit: number; search?: string }>;
  };
  posts: {
    $get: EndpointWithQuery<Post[], { status: "draft" | "published" }, ApiError>;
  };
};

// Usage - query params are fully typed
const { data } = useAPI((api) => api.users.get({ query: { page: 1, limit: 10 } }));
// api.users.get({ query: { foo: "bar" } }); // ✗ Error: 'foo' does not exist
```

#### `EndpointWithFormData<TData, TFormData, TError?>`

For file uploads (multipart/form-data):

```typescript
import { EndpointWithFormData } from "enlace";

type ApiSchema = {
  uploads: {
    $post: EndpointWithFormData<Upload, { file: Blob | File; name: string }>;
  };
  avatars: {
    $post: EndpointWithFormData<Avatar, { image: File }, UploadError>;
  };
};

// Usage - formData is automatically converted to FormData
const { trigger } = useAPI((api) => api.uploads.post);
trigger({
  formData: {
    file: selectedFile,        // File object
    name: "document.pdf",      // String - converted automatically
  }
});
// → Sends as multipart/form-data
```

**FormData conversion rules:**

| Type | Conversion |
|------|------------|
| `File` / `Blob` | Appended directly |
| `string` / `number` / `boolean` | Converted to string |
| `object` (nested) | JSON stringified |
| `array` of primitives | Each item appended separately |
| `array` of files | Each file appended with same key |

#### `EndpointFull<T>`

Object-style for complex endpoints:

```typescript
import { EndpointFull } from "enlace";

type ApiSchema = {
  products: {
    $post: EndpointFull<{
      data: Product;
      body: CreateProduct;
      query: { categoryId: string };
      error: ValidationError;
    }>;
  };
  files: {
    $post: EndpointFull<{
      data: FileUpload;
      formData: { file: File; description: string };
      query: { folder: string };
    }>;
  };
};
```

**Global error type:**

```typescript
type ApiError = { message: string; code: number };

// Second generic sets default error type for all endpoints
const api = createEnlace<ApiSchema, ApiError>("https://api.example.com");
// const useAPI = createEnlaceHookReact<ApiSchema, ApiError>("...");
// const useAPI = createEnlaceHookNext<ApiSchema, ApiError>("...");
```

## React Hooks

### Query Mode (Auto-Fetch)

For GET requests that fetch data automatically:

```typescript
function Posts({ page, limit }: { page: number; limit: number }) {
  const { data, loading, error } = useAPI((api) =>
    api.posts.get({ query: { page, limit, published: true } })
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**Features:**

- Auto-fetches on mount
- Re-fetches when dependencies change (no deps array needed!)
- Returns cached data while revalidating
- **Request deduplication** — identical requests from multiple components trigger only one fetch

### Conditional Fetching

Skip fetching with the `enabled` option:

```typescript
function ProductForm({ id }: { id: string | "new" }) {
  // Skip fetching when creating a new product
  const { data, loading } = useAPI(
    (api) => api.products[id].get(),
    { enabled: id !== "new" }
  );

  if (id === "new") return <CreateProductForm />;
  if (loading) return <div>Loading...</div>;
  return <EditProductForm product={data} />;
}
```

```typescript
// Also useful when waiting for a dependency
function UserPosts({ userId }: { userId: string | undefined }) {
  const { data } = useAPI((api) => api.users[userId!].posts.get(), {
    enabled: userId !== undefined,
  });
}
```

```typescript
function Post({ id }: { id: number }) {
  // Automatically re-fetches when `id` or query values change
  const { data } = useAPI((api) => api.posts[id].get({ query: { include: "author" } }));
  return <div>{data?.title}</div>;
}
```

### Request Deduplication

Multiple components requesting the same data will share a single network request:

```typescript
// Both components render at the same time
function PostTitle({ id }: { id: number }) {
  const { data } = useAPI((api) => api.posts[id].get());
  return <h1>{data?.title}</h1>;
}

function PostBody({ id }: { id: number }) {
  const { data } = useAPI((api) => api.posts[id].get());
  return <p>{data?.body}</p>;
}

// Only ONE fetch request is made to GET /posts/123
// Both components share the same cached result
function PostPage() {
  return (
    <>
      <PostTitle id={123} />
      <PostBody id={123} />
    </>
  );
}
```

### Selector Mode (Manual Trigger)

For mutations or lazy-loaded requests:

```typescript
function DeleteButton({ id }: { id: number }) {
  const { trigger, loading } = useAPI((api) => api.posts[id].delete);

  return (
    <button onClick={() => trigger()} disabled={loading}>
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
```

**With request body:**

```typescript
function CreatePost() {
  const { trigger, loading, data } = useAPI((api) => api.posts.post);

  const handleSubmit = async (title: string) => {
    const result = await trigger({ body: { title } });
    if (!result.error) {
      console.log("Created:", result.data);
    }
  };

  return <button onClick={() => handleSubmit("New Post")}>Create</button>;
}
```

### Dynamic Path Parameters

Use `:paramName` syntax for dynamic IDs passed at trigger time:

```typescript
function PostList({ posts }: { posts: Post[] }) {
  // Define once with :id placeholder
  const { trigger, loading } = useAPI((api) => api.posts[":id"].delete);

  const handleDelete = (postId: number) => {
    // Pass the actual ID when triggering
    trigger({ pathParams: { id: postId } });
  };

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          {post.title}
          <button onClick={() => handleDelete(post.id)} disabled={loading}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Multiple path parameters:**

```typescript
const { trigger } = useAPI(
  (api) => api.users[":userId"].posts[":postId"].delete
);

trigger({ pathParams: { userId: "1", postId: "42" } });
// → DELETE /users/1/posts/42
```

**With request body:**

```typescript
const { trigger } = useAPI((api) => api.products[":id"].patch);

trigger({
  pathParams: { id: "123" },
  body: { name: "Updated Product" },
});
// → PATCH /products/123 with body
```

## Caching & Auto-Revalidation

### Automatic Cache Tags (Zero Config)

**Tags are automatically generated from URL paths** — no manual configuration needed:

```typescript
// GET /posts       → tags: ['posts']
// GET /posts/123   → tags: ['posts', 'posts/123']
// GET /users/5/posts → tags: ['users', 'users/5', 'users/5/posts']
```

**Mutations automatically revalidate matching tags:**

```typescript
const { trigger } = useAPI((api) => api.posts.post);

// POST /posts automatically revalidates 'posts' tag
// All queries with 'posts' tag will refetch!
trigger({ body: { title: "New Post" } });
```

This means in most cases, **you don't need to specify any tags manually**. The cache just works.

### How It Works

1. **Queries** automatically cache with tags derived from the URL
2. **Mutations** automatically revalidate tags derived from the URL
3. All queries matching those tags refetch automatically

```typescript
// Component A: fetches posts (cached with tag 'posts')
const { data } = useAPI((api) => api.posts.get());

// Component B: creates a post
const { trigger } = useAPI((api) => api.posts.post);
trigger({ body: { title: "New" } });
// → Automatically revalidates 'posts' tag
// → Component A refetches automatically!
```

### Stale Time

Control how long cached data is considered fresh:

```typescript
const useAPI = createEnlaceHookReact<ApiSchema>(
  "https://api.example.com",
  {},
  {
    staleTime: 5000, // 5 seconds
  }
);
```

- `staleTime: 0` (default) — Always revalidate on mount
- `staleTime: 5000` — Data is fresh for 5 seconds
- `staleTime: Infinity` — Never revalidate automatically

### Manual Tag Override (Optional)

Override auto-generated tags when needed:

```typescript
// Custom cache tags
const { data } = useAPI((api) => api.posts.get({ tags: ["my-custom-tag"] }));

// Custom revalidation tags
trigger({
  body: { title: "New" },
  revalidateTags: ["posts", "dashboard"], // Override auto-generated
});
```

### Disable Auto-Revalidation

```typescript
const useAPI = createEnlaceHookReact<ApiSchema>(
  "https://api.example.com",
  {},
  {
    autoGenerateTags: false, // Disable auto tag generation
    autoRevalidateTags: false, // Disable auto revalidation
  }
);
```

## Hook Options

```typescript
const useAPI = createEnlaceHookReact<ApiSchema>(
  "https://api.example.com",
  {
    // Default fetch options
    headers: { Authorization: "Bearer token" },
  },
  {
    // Hook options
    autoGenerateTags: true, // Auto-generate cache tags from URL
    autoRevalidateTags: true, // Auto-revalidate after mutations
    staleTime: 0, // Cache freshness duration (ms)
  }
);
```

### Async Headers

Headers can be provided as a static value, sync function, or async function. This is useful when you need to fetch headers dynamically (e.g., auth tokens from async storage):

```typescript
// Static headers
const useAPI = createEnlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
});

// Sync function
const useAPI = createEnlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Async function
const useAPI = createEnlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: async () => {
    const token = await getTokenFromStorage();
    return { Authorization: `Bearer ${token}` };
  },
});
```

This also works for per-request headers:

```typescript
const { data } = useAPI((api) =>
  api.posts.get({
    headers: async () => {
      const token = await refreshToken();
      return { Authorization: `Bearer ${token}` };
    },
  })
);
```

### Global Callbacks

You can set up global `onSuccess` and `onError` callbacks that are called for every request:

```typescript
const useAPI = createEnlaceHookReact<ApiSchema>(
  "https://api.example.com",
  {
    headers: { Authorization: "Bearer token" },
  },
  {
    onSuccess: (payload) => {
      console.log("Request succeeded:", payload.status, payload.data);
    },
    onError: (payload) => {
      if (payload.status === 0) {
        // Network error
        console.error("Network error:", payload.error.message);
      } else {
        // HTTP error (4xx, 5xx)
        console.error("HTTP error:", payload.status, payload.error);
      }
    },
  }
);
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
  | { status: number; error: T; headers: Headers } // HTTP error
  | { status: 0; error: Error; headers: null }; // Network error
```

**Use cases:**

- Global error logging/reporting
- Toast notifications for all API errors
- Authentication refresh on 401 errors
- Analytics tracking

## Return Types

### Query Mode

```typescript
// Basic usage
const result = useAPI((api) => api.posts.get());

// With options
const result = useAPI(
  (api) => api.posts.get(),
  { enabled: true } // Skip fetching when false
);

type UseEnlaceQueryResult<TData, TError> = {
  loading: boolean; // No cached data and fetching
  fetching: boolean; // Request in progress
  data: TData | undefined;
  error: TError | undefined;
};
```

### Selector Mode

```typescript
type UseEnlaceSelectorResult<TMethod> = {
  trigger: TMethod; // Function to trigger the request
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
};
```

### Request Options

```typescript
type RequestOptions = {
  query?: TQuery; // Query parameters (typed when using EndpointWithQuery/EndpointFull)
  body?: TBody; // Request body (JSON)
  formData?: TFormData; // FormData fields (auto-converted, for file uploads)
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>); // Request headers
  tags?: string[]; // Cache tags (GET only)
  revalidateTags?: string[]; // Tags to invalidate after mutation
  pathParams?: Record<string, string | number>; // Dynamic path parameters
};
```

---

## Next.js Integration

### Server Components

Use `createEnlaceNext` from `enlace` for server components:

```typescript
import { createEnlaceNext } from "enlace";

type ApiError = { message: string };

const api = createEnlaceNext<ApiSchema, ApiError>("https://api.example.com", {}, {
  autoGenerateTags: true,
});

export default async function Page() {
  const { data } = await api.posts.get({
    revalidate: 60, // ISR: revalidate every 60 seconds
  });

  return <PostList posts={data} />;
}
```

### Client Components

Use `createEnlaceHookNext` from `enlace/hook` for client components:

```typescript
"use client";

import { createEnlaceHookNext } from "enlace/hook";

type ApiError = { message: string };

const useAPI = createEnlaceHookNext<ApiSchema, ApiError>(
  "https://api.example.com"
);
```

### Server-Side Revalidation

Trigger Next.js cache revalidation after mutations:

```typescript
// actions.ts
"use server";

import { revalidateTag, revalidatePath } from "next/cache";

export async function revalidateAction(tags: string[], paths: string[]) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
  for (const path of paths) {
    revalidatePath(path);
  }
}
```

```typescript
// useAPI.ts
import { createEnlaceHookNext } from "enlace/hook";
import { revalidateAction } from "./actions";

type ApiError = { message: string };

const useAPI = createEnlaceHookNext<ApiSchema, ApiError>(
  "/api",
  {},
  {
    serverRevalidator: revalidateAction,
  }
);
```

**In components:**

```typescript
function CreatePost() {
  const { trigger } = useAPI((api) => api.posts.post);

  const handleCreate = () => {
    trigger({
      body: { title: "New Post" },
      revalidateTags: ["posts"], // Passed to serverRevalidator
      revalidatePaths: ["/posts"], // Passed to serverRevalidator
    });
  };
}
```

### CSR-Heavy Projects

For projects that primarily use client-side rendering with minimal SSR, you can disable server-side revalidation by default:

```typescript
const useAPI = createEnlaceHookNext<ApiSchema, ApiError>(
  "/api",
  {},
  {
    serverRevalidator: revalidateAction,
    skipServerRevalidation: true, // Disable server revalidation by default
  }
);

// Mutations won't trigger server revalidation by default
await trigger({ body: { title: "New Post" } });

// Opt-in to server revalidation when needed
await trigger({ body: { title: "New Post" }, serverRevalidate: true });
```

### Per-Request Server Revalidation Control

Override the global setting for individual requests:

```typescript
// Skip server revalidation for this request
await trigger({ body: data, serverRevalidate: false });

// Force server revalidation for this request
await trigger({ body: data, serverRevalidate: true });
```

### Next.js Request Options

```typescript
api.posts.get({
  tags: ["posts"], // Next.js cache tags
  revalidate: 60, // ISR revalidation (seconds)
  revalidateTags: ["posts"], // Tags to invalidate after mutation
  revalidatePaths: ["/"], // Paths to revalidate after mutation
  serverRevalidate: true, // Control server-side revalidation per-request
});
```

### Relative URLs

Works with Next.js API routes:

```typescript
// Client component calling /api/posts
const useAPI = createEnlaceHookNext<ApiSchema, ApiError>("/api");
```

---

## API Reference

### `createEnlaceHookReact<TSchema, TDefaultError>(baseUrl, options?, hookOptions?)`

Creates a React hook for making API calls.

### `createEnlaceHookNext<TSchema, TDefaultError>(baseUrl, options?, hookOptions?)`

Creates a Next.js hook with server revalidation support.

### `createEnlace<TSchema, TDefaultError>(baseUrl, options?, callbacks?)`

Creates a typed API client (non-hook, for direct calls or server components).

### `createEnlaceNext<TSchema, TDefaultError>(baseUrl, options?, nextOptions?)`

Creates a Next.js typed API client with caching support.

**Generic Parameters:**

- `TSchema` — API schema type defining endpoints
- `TDefaultError` — Default error type for all endpoints (default: `unknown`)

**Function Parameters:**

- `baseUrl` — Base URL for requests
- `options` — Default fetch options (headers, cache, etc.)
- `hookOptions` / `callbacks` / `nextOptions` — Additional configuration

**Hook Options:**

```typescript
type EnlaceHookOptions = {
  autoGenerateTags?: boolean; // default: true
  autoRevalidateTags?: boolean; // default: true
  staleTime?: number; // default: 0
  onSuccess?: (payload: EnlaceCallbackPayload<unknown>) => void;
  onError?: (payload: EnlaceErrorCallbackPayload<unknown>) => void;
};
```

### Re-exports from enlace-core

- `Endpoint` — Type helper for endpoints with JSON body
- `EndpointWithQuery` — Type helper for endpoints with typed query params
- `EndpointWithFormData` — Type helper for file upload endpoints
- `EndpointFull` — Object-style type helper for complex endpoints
- `EnlaceResponse` — Response type
- `EnlaceOptions` — Fetch options type

## OpenAPI Generation

Generate OpenAPI 3.0 specs from your TypeScript schema using [`enlace-openapi`](../openapi/README.md):

```bash
npm install enlace-openapi
enlace-openapi --schema ./types/APISchema.ts --output ./openapi.json
```

## License

MIT
