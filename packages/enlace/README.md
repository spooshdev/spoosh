# enlace

Type-safe API client with React hooks and Next.js integration.

## Installation

```bash
npm install enlace
```

## Quick Start

```typescript
import { enlaceHookReact } from "enlace/hook";
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
const useAPI = enlaceHookReact<ApiSchema, ApiError>("https://api.example.com");
```

## Schema Conventions

Defining a schema is **recommended** for full type safety, but **optional**. You can go without types:

```typescript
// Without schema (untyped, but still works!)
const useAPI = enlaceHookReact("https://api.example.com");
const { data } = useAPI((api) => api.any.path.you.want.$get());
```

```typescript
// With schema (recommended for type safety)
const useAPI = enlaceHookReact<ApiSchema>("https://api.example.com");
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
const api = enlace<ApiSchema, ApiError>("https://api.example.com");

// Usage
api.users.$get(); // GET /users
api.users[123].$get(); // GET /users/123
api.users[123].profile.$get(); // GET /users/123/profile
```

### Endpoint Types

The `Endpoint` type helpers let you define response data, request body, query params, formData, and error types.

#### `Endpoint<TData, TBody?, TError?>`

For endpoints with JSON body:

```typescript
import { Endpoint } from "enlace";

type ApiSchema = {
  posts: {
    $get: Post[]; // Direct type (simplest)
    $post: Endpoint<Post, CreatePost>; // Data + Body
    $put: Endpoint<Post, UpdatePost, ValidationError>; // Data + Body + Error
    $delete: void; // void response
    $patch: Endpoint<Post, never, NotFoundError>; // Custom error without body
  };
};
```

#### `EndpointWithQuery<TData, TQuery, TError?>`

For endpoints with typed query parameters:

```typescript
import { EndpointWithQuery } from "enlace";

type ApiSchema = {
  users: {
    $get: EndpointWithQuery<
      User[],
      { page: number; limit: number; search?: string }
    >;
  };
  posts: {
    $get: EndpointWithQuery<
      Post[],
      { status: "draft" | "published" },
      ApiError
    >;
  };
};

// Usage - query params are fully typed
const { data } = useAPI((api) =>
  api.users.$get({ query: { page: 1, limit: 10 } })
);
// api.users.$get({ query: { foo: "bar" } }); // ✗ Error: 'foo' does not exist
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
const { trigger } = useAPI((api) => api.uploads.$post);
trigger({
  formData: {
    file: selectedFile, // File object
    name: "document.pdf", // String - converted automatically
  },
});
// → Sends as multipart/form-data
```

**FormData conversion rules:**

| Type                            | Conversion                       |
| ------------------------------- | -------------------------------- |
| `File` / `Blob`                 | Appended directly                |
| `string` / `number` / `boolean` | Converted to string              |
| `object` (nested)               | JSON stringified                 |
| `array` of primitives           | Each item appended separately    |
| `array` of files                | Each file appended with same key |

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
const api = enlace<ApiSchema, ApiError>("https://api.example.com");
// const useAPI = enlaceHookReact<ApiSchema, ApiError>("...");
// const useAPI = enlaceHookNext<ApiSchema, ApiError>("...");
```

## React Hooks

### Query Mode (Auto-Fetch)

For GET requests that fetch data automatically:

```typescript
function Posts({ page, limit }: { page: number; limit: number }) {
  const { data, loading, error } = useAPI((api) =>
    api.posts.$get({ query: { page, limit, published: true } })
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
    (api) => api.products[id].$get(),
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
  const { data } = useAPI((api) => api.users[userId!].posts.$get(), {
    enabled: userId !== undefined,
  });
}
```

```typescript
function Post({ id }: { id: number }) {
  // Automatically re-fetches when `id` or query values change
  const { data } = useAPI((api) => api.posts[id].$get({ query: { include: "author" } }));
  return <div>{data?.title}</div>;
}
```

### Polling

Automatically refetch data at intervals using the `pollingInterval` option. Polling uses sequential timing — the interval starts counting **after** the previous request completes, preventing request pile-up:

```typescript
function Notifications() {
  const { data } = useAPI(
    (api) => api.notifications.$get(),
    { pollingInterval: 5000 } // Refetch every 5 seconds after previous request completes
  );

  return <NotificationList notifications={data} />;
}
```

**Behavior:**

- Polling starts after the initial fetch completes
- Next poll is scheduled only after the current request finishes (success or error)
- Continues polling even on errors (retry behavior)
- Stops when component unmounts or `enabled` becomes `false`
- Resets when component remounts

**Dynamic polling with function:**

Use a function to conditionally poll based on the response data or error:

```typescript
function OrderStatus({ orderId }: { orderId: string }) {
  const { data } = useAPI(
    (api) => api.orders[orderId].$get(),
    {
      // Poll every 2s while pending, stop when completed
      pollingInterval: (order) => order?.status === "pending" ? 2000 : false,
    }
  );

  return <div>Status: {data?.status}</div>;
}
```

The function receives `(data, error)` and should return:

- `number`: Interval in milliseconds
- `false`: Stop polling

```typescript
// Poll faster when there's an error (retry), slower otherwise
{
  pollingInterval: (data, error) => (error ? 1000 : 10000);
}

// Stop polling once data meets a condition
{
  pollingInterval: (order) => (order?.status === "completed" ? false : 3000);
}
```

**Combined with conditional fetching:**

```typescript
function OrderStatus({ orderId }: { orderId: string | undefined }) {
  const { data } = useAPI((api) => api.orders[orderId!].$get(), {
    enabled: !!orderId,
    pollingInterval: 10000, // Poll every 10 seconds
  });
  // Polling only runs when orderId is defined
}
```

### Request Deduplication

Multiple components requesting the same data will share a single network request:

```typescript
// Both components render at the same time
function PostTitle({ id }: { id: number }) {
  const { data } = useAPI((api) => api.posts[id].$get());
  return <h1>{data?.title}</h1>;
}

function PostBody({ id }: { id: number }) {
  const { data } = useAPI((api) => api.posts[id].$get());
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
  const { trigger, loading } = useAPI((api) => api.posts[id].$delete);

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
  const { trigger, loading, data } = useAPI((api) => api.posts.$post);

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
  const { trigger, loading } = useAPI((api) => api.posts[":id"].$delete);

  const handleDelete = (postId: number) => {
    // Pass the actual ID when triggering
    trigger({ params: { id: postId } });
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
  (api) => api.users[":userId"].posts[":postId"].$delete
);

trigger({ params: { userId: "1", postId: "42" } });
// → DELETE /users/1/posts/42
```

**With request body:**

```typescript
const { trigger } = useAPI((api) => api.products[":id"].$patch);

trigger({
  params: { id: "123" },
  body: { name: "Updated Product" },
});
// → PATCH /products/123 with body
```

### Optimistic Updates

Update the UI instantly before the server responds, with automatic rollback on error:

```typescript
function DeletePost({ id }: { id: number }) {
  const { trigger } = useAPI((api) => api.posts[":id"].$delete);

  const handleDelete = () => {
    trigger({
      params: { id },
      optimistic: (cache, api) => cache({
        for: api.posts.$get,
        updater: (posts) => posts.filter((p) => p.id !== id),
      }),
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

**With response data (e.g., creating a post):**

```typescript
function CreatePost() {
  const { trigger } = useAPI((api) => api.posts.$post);

  const handleCreate = async () => {
    await trigger({
      body: { title: "New Post", content: "..." },
      optimistic: (cache, api) => cache({
        for: api.posts.$get,
        timing: "onSuccess", // Wait for response
        updater: (posts, newPost) => [...posts, newPost!],
        //               ^^^^^^^ typed as Post (mutation response)
      }),
    });
  };
}
```

**Multiple cache updates:**

```typescript
trigger({
  optimistic: (cache, api) => [
    cache({
      for: api.posts.$get,
      updater: (posts) => posts.filter((p) => p.id !== id),
    }),
    cache({
      for: api.dashboard.stats.$get,
      timing: "onSuccess",
      updater: (stats, _) => ({ ...stats, postCount: stats.postCount - 1 }),
    }),
  ],
});
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `for` | `api.path.$get` | required | Which cache to update |
| `updater` | `(data, response?) => data` | required | Transform function |
| `timing` | `"immediate"` \| `"onSuccess"` | `"immediate"` | When to apply update |
| `rollbackOnError` | `boolean` | `true` | Revert on failure |
| `refetch` | `boolean` | `false` | Still refetch after update (rarely needed) |
| `onError` | `(error) => void` | - | Error callback (e.g., show toast) |

### Retry

Configure automatic retry for failed requests:

```typescript
const useAPI = enlaceHookReact<ApiSchema>(
  "https://api.example.com",
  {},
  {
    retry: 3,        // Retry up to 3 times (default)
    retryDelay: 1000 // Base delay 1s with exponential backoff
  }
);
```

**Per-query retry:**

```typescript
const { data } = useAPI(
  (api) => api.posts.$get(),
  {
    retry: 5,         // Override for this query
    retryDelay: 500   // Faster retry
  }
);
```

**Disable retry:**

```typescript
const { data } = useAPI(
  (api) => api.posts.$get(),
  { retry: false }
);
```

Retry uses exponential backoff: 1s → 2s → 4s → 8s...

### Abort Requests

Cancel in-flight requests using the `abort` function:

```typescript
function SearchPosts() {
  const { data, loading, abort } = useAPI((api) =>
    api.posts.$get({ query: { search: debouncedQuery } })
  );

  // Abort on unmount or query change is automatic
  // Manual abort:
  return (
    <div>
      {loading && <button onClick={abort}>Cancel</button>}
      <PostList posts={data} />
    </div>
  );
}
```

**In selector mode:**

```typescript
function UploadFile() {
  const { trigger, loading, abort } = useAPI((api) => api.files.$post);

  const handleUpload = () => {
    trigger({ formData: { file: selectedFile } });
  };

  return (
    <div>
      <button onClick={handleUpload} disabled={loading}>Upload</button>
      {loading && <button onClick={abort}>Cancel Upload</button>}
    </div>
  );
}
```

**Abort behavior:**

- Returns `{ aborted: true }` in the response
- Optimistic updates are automatically rolled back on abort
- No error is thrown; check `response.aborted` if needed

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
const { trigger } = useAPI((api) => api.posts.$post);

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
const { data } = useAPI((api) => api.posts.$get());

// Component B: creates a post
const { trigger } = useAPI((api) => api.posts.$post);
trigger({ body: { title: "New" } });
// → Automatically revalidates 'posts' tag
// → Component A refetches automatically!
```

### Stale Time

Control how long cached data is considered fresh:

```typescript
const useAPI = enlaceHookReact<ApiSchema>(
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
// Custom cache tags (replaces auto-generated)
const { data } = useAPI((api) => api.posts.$get({ tags: ["my-custom-tag"] }));

// Custom revalidation tags (replaces auto-generated)
trigger({
  body: { title: "New" },
  revalidateTags: ["posts", "dashboard"],
});
```

### Extending Auto-Generated Tags

Use `additionalTags` and `additionalRevalidateTags` to **merge** with auto-generated tags instead of replacing them:

```typescript
// Extend cache tags (merges with auto-generated)
const { data } = useAPI((api) =>
  api.posts.$get({ additionalTags: ["custom-tag"] })
);
// If autoGenerateTags produces ['posts'], final tags: ['posts', 'custom-tag']

// Extend revalidation tags (merges with auto-generated)
trigger({
  body: { title: "New" },
  additionalRevalidateTags: ["dashboard", "stats"],
});
// If autoRevalidateTags produces ['posts'], final tags: ['posts', 'dashboard', 'stats']
```

**Behavior:**

| Scenario | `tags` / `revalidateTags` | `additionalTags` / `additionalRevalidateTags` | Final Tags |
|----------|---------------------------|-----------------------------------------------|------------|
| Override | `['custom']` | - | `['custom']` |
| Extend auto | - | `['extra']` | `['posts', 'extra']` |
| Both | `['custom']` | `['extra']` | `['custom', 'extra']` |
| Neither | - | - | `['posts']` (auto) |

### Manual Tag Invalidation

Use `invalidateTags` to manually trigger cache invalidation and refetch queries:

```typescript
import { invalidateTags } from "enlace/hook";

// Invalidate all queries tagged with 'posts'
invalidateTags(["posts"]);

// Invalidate multiple tags
invalidateTags(["posts", "users"]);
```

This is useful when you need to refresh data outside of the normal mutation flow, such as:

- After receiving a WebSocket message
- After a background sync
- After external state changes

### Disable Auto-Revalidation

```typescript
const useAPI = enlaceHookReact<ApiSchema>(
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
const useAPI = enlaceHookReact<ApiSchema>(
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
const useAPI = enlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: { Authorization: "Bearer token" },
});

// Sync function
const useAPI = enlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

// Async function
const useAPI = enlaceHookReact<ApiSchema>("https://api.example.com", {
  headers: async () => {
    const token = await getTokenFromStorage();
    return { Authorization: `Bearer ${token}` };
  },
});
```

This also works for per-request headers:

```typescript
const { data } = useAPI((api) =>
  api.posts.$get({
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
const useAPI = enlaceHookReact<ApiSchema>(
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
const result = useAPI((api) => api.posts.$get());

// With options
const result = useAPI((api) => api.posts.$get(), {
  enabled: true, // Skip fetching when false
  pollingInterval: 5000, // Refetch every 5s after previous request completes
});

// With dynamic polling
const result = useAPI((api) => api.orders[id].$get(), {
  pollingInterval: (order) => (order?.status === "pending" ? 2000 : false),
});

type UseEnlaceQueryResult<TData, TError> = {
  loading: boolean; // No cached data and fetching
  fetching: boolean; // Request in progress
  data: TData | undefined;
  error: TError | undefined;
  abort: () => void; // Cancel in-flight request
  isOptimistic: boolean; // Data is from optimistic update (not confirmed)
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
  abort: () => void; // Cancel in-flight request
};
```

### Query Options

```typescript
type UseEnlaceQueryOptions<TData, TError> = {
  enabled?: boolean; // Skip fetching when false (default: true)
  pollingInterval?: // Refetch interval after request completes
    | number // Fixed interval in ms
    | false // Disable polling
    | ((data: TData | undefined, error: TError | undefined) => number | false); // Dynamic
};
```

### Request Options

```typescript
type RequestOptions = {
  query?: TQuery; // Query parameters (typed when using EndpointWithQuery/EndpointFull)
  body?: TBody; // Request body (JSON)
  formData?: TFormData; // FormData fields (auto-converted, for file uploads)
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>); // Request headers
  tags?: string[]; // Cache tags - replaces auto-generated (GET only)
  additionalTags?: string[]; // Cache tags - merges with auto-generated (GET only)
  revalidateTags?: string[]; // Revalidation tags - replaces auto-generated
  additionalRevalidateTags?: string[]; // Revalidation tags - merges with auto-generated
  params?: Record<string, string | number>; // Dynamic path parameters
  optimistic?: (cache, api) => CacheConfig | CacheConfig[]; // Optimistic updates (mutations only)
};
```

---

## Next.js Integration

### Server Components

Use `enlaceNext` from `enlace` for server components:

```typescript
import { enlaceNext } from "enlace";

type ApiError = { message: string };

const api = enlaceNext<ApiSchema, ApiError>("https://api.example.com", {}, {
  autoGenerateTags: true,
});

export default async function Page() {
  const { data } = await api.posts.$get({
    revalidate: 60, // ISR: revalidate every 60 seconds
  });

  return <PostList posts={data} />;
}
```

### Client Components

Use `enlaceHookNext` from `enlace/hook` for client components:

```typescript
"use client";

import { enlaceHookNext } from "enlace/hook";

type ApiError = { message: string };

const useAPI = enlaceHookNext<ApiSchema, ApiError>("https://api.example.com");
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
import { enlaceHookNext } from "enlace/hook";
import { revalidateAction } from "./actions";

type ApiError = { message: string };

const useAPI = enlaceHookNext<ApiSchema, ApiError>(
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
  const { trigger } = useAPI((api) => api.posts.$post);

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
const useAPI = enlaceHookNext<ApiSchema, ApiError>(
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
api.posts.$get({
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
const useAPI = enlaceHookNext<ApiSchema, ApiError>("/api");
```

---

## API Reference

### `enlaceHookReact<TSchema, TDefaultError>(baseUrl, options?, hookOptions?)`

Creates a React hook for making API calls.

### `enlaceHookNext<TSchema, TDefaultError>(baseUrl, options?, hookOptions?)`

Creates a Next.js hook with server revalidation support.

### `enlace<TSchema, TDefaultError>(baseUrl, options?, callbacks?)`

Creates a typed API client (non-hook, for direct calls or server components).

### `enlaceNext<TSchema, TDefaultError>(baseUrl, options?, nextOptions?)`

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

## Framework Adapters

### Hono

Use [`enlace-hono`](../hono/README.md) to automatically generate Enlace schemas from your Hono app:

```typescript
import { Hono } from "hono";
import type { HonoToEnlace } from "enlace-hono";

const app = new Hono()
  .basePath("/api")
  .get("/posts", (c) => c.json([{ id: 1, title: "Hello" }]))
  .get("/posts/:id", (c) => c.json({ id: c.req.param("id") }));

// Auto-generate schema from Hono types
type ApiSchema = HonoToEnlace<typeof app>;

// Use with Enlace
const client = enlace<ApiSchema["api"]>("http://localhost:3000/api");
```

## License

MIT
