# @spoosh/plugin-invalidation

Cache invalidation plugin for Spoosh - auto-invalidates related queries after mutations.

**[Documentation](https://spoosh.dev/docs/react/plugins/invalidation)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-invalidation
```

## How It Works

Tags are automatically generated from the API path hierarchy:

```typescript
// Query tags are generated from the path:
useRead((api) => api("users").GET());
// → tags: ["users"]

useRead((api) => api("users/:id").GET({ params: { id: 123 } }));
// → tags: ["users", "users/123"]

useRead((api) => api("users/:id/posts").GET({ params: { id: 123 } }));
// → tags: ["users", "users/123", "users/123/posts"]
```

When a mutation succeeds, related queries are automatically invalidated:

```typescript
// Creating a post at users/123/posts invalidates:
const { trigger } = useWrite((api) => api("users/:id/posts").POST);
await trigger({ params: { id: 123 }, body: { title: "New Post" } });

// ✓ Invalidates: "users", "users/123", "users/123/posts"
// All queries matching these tags will refetch automatically
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([invalidationPlugin()]);

const { trigger } = useWrite((api) => api("posts").POST);
await trigger({ body: { title: "New Post" } });
```

## Default Configuration

```typescript
// Default: invalidate all related tags (full hierarchy)
invalidationPlugin(); // same as { defaultMode: "all" }

// Only invalidate the exact endpoint by default
invalidationPlugin({ defaultMode: "self" });

// Disable auto-invalidation by default (manual only)
invalidationPlugin({ defaultMode: "none" });
```

## Per-Request Invalidation

```typescript
// Mode only (string)
await trigger({
  body: { title: "New Post" },
  invalidate: "all", // Invalidate entire path hierarchy
});

await trigger({
  body: { title: "New Post" },
  invalidate: "self", // Only invalidate the exact endpoint
});

await trigger({
  body: { title: "New Post" },
  invalidate: "none", // No invalidation
});

// Single tag (string)
await trigger({
  body: { title: "New Post" },
  invalidate: "posts", // Invalidate only "posts" tag
});

// Multiple tags (array without mode keyword)
await trigger({
  body: { title: "New Post" },
  invalidate: ["posts", "users", "custom-tag"],
  // → Default mode: 'none' (only explicit tags are invalidated)
});

// Mode + Tags (array with mode keyword at any position)
await trigger({
  body: { title: "New Post" },
  invalidate: ["all", "dashboard", "stats"],
  // → 'all' mode + explicit tags
});

await trigger({
  body: { title: "New Post" },
  invalidate: ["posts", "self", "users"],
  // → 'self' mode + explicit tags
});

await trigger({
  body: { title: "New Post" },
  invalidate: ["dashboard", "stats", "all"],
  // → 'all' mode + explicit tags (mode can be anywhere)
});

// Wildcard - global refetch
await trigger({
  body: { title: "New Post" },
  invalidate: "*", // Triggers ALL queries to refetch
});

// Combined with clearCache (from @spoosh/plugin-cache)
await trigger({
  clearCache: true, // Clear all cached data
  invalidate: "*", // Then refetch all queries
});
```

## Options

### Plugin Config

| Option        | Type                        | Default | Description                                         |
| ------------- | --------------------------- | ------- | --------------------------------------------------- |
| `defaultMode` | `"all" \| "self" \| "none"` | `"all"` | Default invalidation mode when option not specified |

### Per-Request Options

| Option       | Type                                                     | Description                                                                                                                      |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `invalidate` | `"all" \| "self" \| "none" \| "*" \| string \| string[]` | Mode (`"all"`, `"self"`, `"none"`), wildcard (`"*"` for global refetch), single tag, or array of tags with optional mode keyword |

### Invalidation Modes

| Mode     | Description                             | Example                                                     |
| -------- | --------------------------------------- | ----------------------------------------------------------- |
| `"all"`  | Invalidate all tags from path hierarchy | `users/123/posts` → `users`, `users/123`, `users/123/posts` |
| `"self"` | Only invalidate the exact endpoint tag  | `users/123/posts` → `users/123/posts`                       |
| `"none"` | Disable auto-invalidation (manual only) | No automatic invalidation                                   |
| `"*"`    | Global refetch - triggers all queries   | All active queries refetch                                  |

### Understanding `"all"` vs `"*"`

These two options serve different purposes:

- **`"all"`** - Invalidates all tags **from the current endpoint's path hierarchy**. If you're mutating `users/123/posts`, it invalidates `["users", "users/123", "users/123/posts"]`. It's scoped to the mutation's path.

- **`"*"`** - Triggers a **global refetch of every active query** in your app, regardless of tags. Use this sparingly for scenarios like "user logged out" or "full data sync from server".

```typescript
// "all" - scoped to this mutation's path hierarchy
await trigger({ invalidate: "all" });
// If path is users/123/posts → invalidates: users, users/123, users/123/posts

// "*" - refetches ALL queries in the entire app
await trigger({ invalidate: "*" });
// Every active useRead/injectRead will refetch
```

## Instance API

The plugin exposes `invalidate` for manually triggering cache invalidation outside of mutations:

```typescript
import { createReactSpoosh } from "@spoosh/react";

const { useRead, invalidate } = createReactSpoosh(client);

// Invalidate with string array
invalidate(["users", "posts"]);

// Invalidate with single string
invalidate("users");

// Global refetch - triggers ALL queries to refetch
invalidate("*");

// Useful for external events like WebSocket messages
socket.on("data-changed", (tags) => {
  invalidate(tags);
});

// WebSocket: trigger global refetch
socket.on("full-sync", () => {
  invalidate("*");
});
```

| Method       | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `invalidate` | Manually invalidate cache entries by tags, or use `"*"` to refetch all |

## Combining with Cache Plugin

For scenarios like logout or user switching, combine `invalidate: "*"` with `clearCache` from `@spoosh/plugin-cache`:

```typescript
const { trigger } = useWrite((api) => api("auth/logout").POST);

// Clear cache + trigger all queries to refetch
await trigger({
  clearCache: true, // From cache plugin: clear all cached data
  invalidate: "*", // From invalidation plugin: trigger all queries to refetch
});
```

This ensures both:

1. All cached data is cleared (no stale data from previous session)
2. All active queries refetch with fresh data
