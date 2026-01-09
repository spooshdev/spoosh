# enlace

Type-safe API client with React hooks and a composable plugin system.

## Installation

```bash
npm install enlace
```

## Quick Start

```typescript
import {
  enlaceHooks,
  cachePlugin,
  retryPlugin,
  pollingPlugin,
  refetchPlugin,
  optimisticPlugin,
  invalidationPlugin,
  Endpoint,
} from "enlace";

type ApiError = { message: string; code: number };

type ApiSchema = {
  posts: {
    $get: Post[];
    $post: Endpoint<Post, CreatePost>;
    _: {
      $get: Post;
      $delete: void;
    };
  };
};

const plugins = [
  cachePlugin({ staleTime: 5000 }),
  retryPlugin({ retries: 3 }),
  pollingPlugin(),
  refetchPlugin({ refetchOnFocus: true }),
  optimisticPlugin(),
  invalidationPlugin(),
] as const;

const { useRead, useWrite, useInfiniteRead } = enlaceHooks<ApiSchema, ApiError>()({
  baseUrl: "https://api.example.com",
  plugins,
});
```

## Plugin System

Enlace uses a composable plugin architecture. Plugins are executed in order and can modify request/response behavior at various lifecycle points.

### Available Plugins

| Plugin               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `cachePlugin`        | Response caching with stale time control         |
| `retryPlugin`        | Automatic retry with exponential backoff         |
| `pollingPlugin`      | Periodic refetching at configurable intervals    |
| `refetchPlugin`      | Refetch on focus, reconnect, or invalidation     |
| `optimisticPlugin`   | Optimistic UI updates with automatic rollback    |
| `invalidationPlugin` | Tag-based cache invalidation after mutations     |
| `nextjsPlugin`       | Next.js server-side revalidation integration     |

### cachePlugin

Caches responses and serves stale data while revalidating.

```typescript
cachePlugin({
  staleTime: 5000, // Data is fresh for 5 seconds (default: 0)
})
```

**Per-request override:**

```typescript
const { data } = useRead((api) => api.posts.$get(), {
  staleTime: 60000, // Override for this query
});
```

### retryPlugin

Automatically retries failed requests with exponential backoff.

```typescript
retryPlugin({
  retries: 3,        // Max retry attempts (default: 3)
  retryDelay: 1000,  // Base delay in ms (default: 1000)
})
```

**Per-request override:**

```typescript
const { data } = useRead((api) => api.posts.$get(), {
  retries: 5,
  retryDelay: 500,
});

// Disable retry for specific request
const { data } = useRead((api) => api.posts.$get(), { retries: false });
```

### pollingPlugin

Enables periodic refetching. Polling uses sequential timing — the interval starts after the previous request completes.

```typescript
pollingPlugin()
```

**Usage:**

```typescript
const { data } = useRead((api) => api.notifications.$get(), {
  pollingInterval: 5000, // Refetch every 5 seconds
});

// Dynamic polling based on response
const { data } = useRead((api) => api.orders[id].$get(), {
  pollingInterval: (order) => (order?.status === "pending" ? 2000 : false),
});
```

### refetchPlugin

Handles refetching on window focus, network reconnect, and tag invalidation.

```typescript
refetchPlugin({
  refetchOnFocus: true,     // Refetch when window gains focus (default: false)
  refetchOnReconnect: true, // Refetch when network reconnects (default: false)
})
```

**Per-request override:**

```typescript
const { data } = useRead((api) => api.posts.$get(), {
  refetchOnFocus: false,
});
```

### optimisticPlugin

Enables optimistic UI updates with automatic rollback on error.

```typescript
optimisticPlugin()
```

**Usage:**

```typescript
const { trigger } = useWrite((api) => api.posts[":id"].$delete);

trigger({
  params: { id: postId },
  optimistic: (cache, api) =>
    cache({
      for: api.posts.$get,
      updater: (posts) => posts.filter((p) => p.id !== postId),
    }),
});
```

See [Optimistic Updates](#optimistic-updates) for more details.

### invalidationPlugin

Automatically invalidates cache tags after mutations.

```typescript
invalidationPlugin({
  autoInvalidate: "all", // "all" | "self" | false (default: "all")
})
```

- `"all"` — Invalidate all tags derived from the mutation path
- `"self"` — Only invalidate the exact path tag
- `false` — Disable auto-invalidation

**Per-request override:**

```typescript
trigger({
  body: { title: "New Post" },
  autoInvalidate: false, // Disable for this mutation
  invalidate: (api) => [api.posts.$get, api.dashboard.stats.$get], // Manual tags
});
```

### nextjsPlugin

Integrates with Next.js server-side revalidation.

```typescript
// actions.ts
"use server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function serverRevalidator(tags: string[], paths: string[]) {
  tags.forEach((tag) => revalidateTag(tag));
  paths.forEach((path) => revalidatePath(path));
}

// hooks.ts
import { nextjsPlugin } from "enlace";
import { serverRevalidator } from "./actions";

nextjsPlugin({ serverRevalidator })
```

**Per-request path revalidation:**

```typescript
trigger({
  body: { title: "New Post" },
  revalidatePaths: ["/posts", "/dashboard"], // Next.js paths to revalidate
});
```

## Schema Conventions

Defining a schema is **recommended** for full type safety, but **optional**.

```typescript
import { Endpoint, EndpointWithQuery, EndpointWithFormData } from "enlace";

type ApiSchema = {
  users: {
    $get: User[];                                    // GET /users
    $post: Endpoint<User, CreateUser>;               // POST /users with body
    _: {                                             // /users/:id
      $get: User;                                    // GET /users/:id
      $put: Endpoint<User, UpdateUser>;              // PUT /users/:id
      $delete: void;                                 // DELETE /users/:id
      profile: {
        $get: Profile;                               // GET /users/:id/profile
      };
    };
  };
  posts: {
    $get: EndpointWithQuery<Post[], { page: number; limit: number }>;
  };
  uploads: {
    $post: EndpointWithFormData<Upload, { file: File; name: string }>;
  };
};
```

- `$get`, `$post`, `$put`, `$patch`, `$delete` — HTTP method endpoints
- `_` — Dynamic path segment (e.g., `/users/:id`)

## React Hooks

### useRead

For GET requests that fetch data automatically:

```typescript
function Posts() {
  const { data, loading, error, fetching, isOptimistic, abort } = useRead(
    (api) => api.posts.$get({ query: { page: 1, limit: 10 } })
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

**Options:**

```typescript
const { data } = useRead((api) => api.posts.$get(), {
  // Base options
  enabled: true,             // Skip fetching when false
  tags: ["custom-tag"],      // Override auto-generated tags
  additionalTags: ["extra"], // Append to auto-generated tags

  // Plugin options
  staleTime: 5000,           // Cache freshness (from cachePlugin)
  retries: 3,                // Retry attempts (from retryPlugin)
  pollingInterval: 5000,     // Polling interval (from pollingPlugin)
  refetchOnFocus: true,      // Refetch on focus (from refetchPlugin)
});
```

**Conditional fetching:**

```typescript
const { data } = useRead((api) => api.users[userId!].posts.$get(), {
  enabled: userId !== undefined,
});
```

### useWrite

For mutations (POST, PUT, PATCH, DELETE):

```typescript
function CreatePost() {
  const { trigger, loading, data, error, abort } = useWrite(
    (api) => api.posts.$post
  );

  const handleSubmit = async (title: string) => {
    const result = await trigger({ body: { title } });
    if (!result.error) {
      console.log("Created:", result.data);
    }
  };

  return (
    <button onClick={() => handleSubmit("New Post")} disabled={loading}>
      Create
    </button>
  );
}
```

**Dynamic path parameters:**

```typescript
const { trigger } = useWrite((api) => api.posts[":id"].$delete);

trigger({ params: { id: postId } });
// → DELETE /posts/123
```

### useInfiniteRead

For paginated data with infinite scroll:

```typescript
function PostFeed() {
  const {
    data,
    allResponses,
    loading,
    fetchingNext,
    canFetchNext,
    fetchNext,
    refetch,
  } = useInfiniteRead(
    (api) => api.posts.$get({ query: { limit: 20 } }),
    {
      canFetchNext: ({ response }) => response?.meta.hasMore ?? false,
      nextPageRequest: ({ response }) => ({
        query: { cursor: response?.meta.nextCursor },
      }),
      merger: (allResponses) => allResponses.flatMap((r) => r.items),
    }
  );

  return (
    <div>
      {data?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {canFetchNext && (
        <button onClick={fetchNext} disabled={fetchingNext}>
          Load More
        </button>
      )}
    </div>
  );
}
```

## Optimistic Updates

Update the UI instantly before the server responds:

```typescript
const { trigger } = useWrite((api) => api.posts[":id"].$delete);

trigger({
  params: { id: postId },
  optimistic: (cache, api) =>
    cache({
      for: api.posts.$get,
      updater: (posts) => posts.filter((p) => p.id !== postId),
      rollbackOnError: true,
    }),
});
```

**With response data (e.g., creating):**

```typescript
trigger({
  body: { title: "New Post" },
  optimistic: (cache, api) =>
    cache({
      for: api.posts.$get,
      timing: "onSuccess", // Wait for response
      updater: (posts, newPost) => [...posts, newPost],
    }),
});
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
      updater: (stats) => ({ ...stats, postCount: stats.postCount - 1 }),
    }),
  ],
});
```

**Targeting specific cache entries with `match`:**

```typescript
trigger({
  optimistic: (cache, api) =>
    cache({
      for: api.posts.paginated.$get,
      match: (request) => request.query?.page === 1,
      updater: (data, newPost) => ({
        ...data,
        items: [newPost, ...data.items],
      }),
    }),
});
```

**Options:**

| Option            | Type                           | Default       | Description                            |
| ----------------- | ------------------------------ | ------------- | -------------------------------------- |
| `for`             | `api.path.$get`                | required      | Which cache to update                  |
| `match`           | `(request) => boolean`         | -             | Filter which cache entries to update   |
| `updater`         | `(data, response?) => data`    | required      | Transform function                     |
| `timing`          | `"immediate"` \| `"onSuccess"` | `"immediate"` | When to apply update                   |
| `rollbackOnError` | `boolean`                      | `true`        | Revert on failure                      |
| `onError`         | `(error) => void`              | -             | Error callback                         |

## Caching & Auto-Revalidation

### Automatic Cache Tags

Tags are automatically generated from URL paths:

```typescript
// GET /posts       → tags: ['posts']
// GET /posts/123   → tags: ['posts', 'posts/123']
// GET /users/5/posts → tags: ['users', 'users/5', 'users/5/posts']
```

**Mutations automatically invalidate matching tags:**

```typescript
const { trigger } = useWrite((api) => api.posts.$post);
trigger({ body: { title: "New" } });
// → Automatically invalidates 'posts' tag
// → All queries with 'posts' tag refetch
```

### Custom Tags

Override or extend auto-generated tags:

```typescript
// Replace auto-generated tags entirely
useRead((api) => api.posts.$get(), {
  tags: ["my-custom-tag"],
});

// Disable tags (no invalidation)
useRead((api) => api.posts.$get(), {
  tags: [],
});

// Add to auto-generated tags
useRead((api) => api.posts.$get(), {
  additionalTags: ["dashboard", "sidebar"],
});
// → tags: ['posts', 'dashboard', 'sidebar']
```

### Manual Tag Invalidation

```typescript
const { eventEmitter } = enlaceHooks<ApiSchema, ApiError>()({
  baseUrl: "https://api.example.com",
  plugins,
});

// Invalidate specific tags
eventEmitter.emit("invalidate", ["posts", "users"]);
```

## Request Deduplication

Multiple components requesting the same data share a single network request:

```typescript
function PostTitle({ id }: { id: number }) {
  const { data } = useRead((api) => api.posts[id].$get());
  return <h1>{data?.title}</h1>;
}

function PostBody({ id }: { id: number }) {
  const { data } = useRead((api) => api.posts[id].$get());
  return <p>{data?.body}</p>;
}

// Both render → Only ONE fetch to GET /posts/123
```

## Abort Requests

```typescript
function SearchPosts() {
  const { data, loading, abort } = useRead((api) =>
    api.posts.$get({ query: { search: query } })
  );

  return (
    <div>
      {loading && <button onClick={abort}>Cancel</button>}
      <PostList posts={data} />
    </div>
  );
}
```

## Return Types

### useRead

```typescript
type UseReadResult<TData, TError> = {
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  isOptimistic: boolean;
  isStale: boolean;
  abort: () => void;
};
```

### useWrite

```typescript
type UseWriteResult<TData, TError> = {
  trigger: (options) => Promise<EnlaceResponse<TData, TError>>;
  loading: boolean;
  fetching: boolean;
  data: TData | undefined;
  error: TError | undefined;
  abort: () => void;
  reset: () => void;
};
```

### useInfiniteRead

```typescript
type UseInfiniteReadResult<TData, TError, TItem> = {
  data: TItem[] | undefined;
  allResponses: TData[] | undefined;
  loading: boolean;
  fetching: boolean;
  fetchingNext: boolean;
  fetchingPrev: boolean;
  canFetchNext: boolean;
  canFetchPrev: boolean;
  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  refetch: () => Promise<void>;
  abort: () => void;
  error: TError | undefined;
  isOptimistic: boolean;
};
```

## API Reference

### `enlaceHooks<TSchema, TDefaultError>()(config)`

Creates React hooks with the plugin system.

```typescript
const { useRead, useWrite, useInfiniteRead, api, stateManager, eventEmitter } =
  enlaceHooks<ApiSchema, ApiError>()({
    baseUrl: "https://api.example.com",
    plugins,
    defaultOptions: {
      headers: { Authorization: "Bearer token" },
    },
  });
```

### Re-exports from enlace-core

- `Endpoint` — Type helper for endpoints with JSON body
- `EndpointWithQuery` — Type helper for endpoints with typed query params
- `EndpointWithFormData` — Type helper for file upload endpoints
- `EndpointFull` — Object-style type helper for complex endpoints
- `EnlaceResponse` — Response type

## Framework Adapters

### Hono

Use [`enlace-hono`](../hono/README.md) to generate schemas from Hono apps:

```typescript
import type { HonoToEnlace } from "enlace-hono";

const app = new Hono()
  .basePath("/api")
  .get("/posts", (c) => c.json([{ id: 1, title: "Hello" }]));

type ApiSchema = HonoToEnlace<typeof app>;
```

## License

MIT
