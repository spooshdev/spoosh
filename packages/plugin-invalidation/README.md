# @spoosh/plugin-invalidation

Cache invalidation plugin for Spoosh - auto-invalidates related queries after mutations using wildcard patterns.

**[Documentation](https://spoosh.dev/docs/react/plugins/invalidation)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-invalidation
```

## How It Works

Tags are automatically generated from the API path:

```typescript
useRead((api) => api("posts").GET());
// → tag: "posts"

useRead((api) => api("posts/:id").GET({ params: { id: 123 } }));
// → tag: "posts/123"

useRead((api) => api("posts/:id/comments").GET({ params: { id: 123 } }));
// → tag: "posts/123/comments"
```

When a mutation succeeds, related queries are automatically invalidated using wildcard patterns:

```typescript
const { trigger } = useWrite((api) => api("posts/:id/comments").POST());
await trigger({ params: { id: 123 }, body: { text: "Hello" } });

// Default behavior (autoInvalidate: true):
// Invalidates: ["posts", "posts/*"]
// ✓ Matches: "posts", "posts/123", "posts/123/comments", etc.
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([invalidationPlugin()]);

const { trigger } = useWrite((api) => api("posts").POST());
await trigger({ body: { title: "New Post" } });
```

## Pattern Matching

| Pattern | Matches | Does NOT Match |
|---------|---------|----------------|
| `"posts"` | `"posts"` (exact) | `"posts/1"`, `"users"` |
| `"posts/*"` | `"posts/1"`, `"posts/1/comments"` | `"posts"` (parent) |
| `["posts", "posts/*"]` | `"posts"` AND all children | - |

## Per-Request Invalidation

```typescript
// Exact match only
await trigger({
  body: { title: "New Post" },
  invalidate: "posts",
});

// Children only (not the parent)
await trigger({
  body: { title: "New Post" },
  invalidate: "posts/*",
});

// Parent AND all children
await trigger({
  body: { title: "New Post" },
  invalidate: ["posts", "posts/*"],
});

// Multiple patterns
await trigger({
  body: { title: "New Post" },
  invalidate: ["posts", "users/*", "dashboard"],
});

// Disable invalidation for this mutation
await trigger({
  body: { title: "New Post" },
  invalidate: false,
});

// Global refetch - triggers ALL queries to refetch
await trigger({
  body: { title: "New Post" },
  invalidate: "*",
});
```

## Options

### Plugin Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoInvalidate` | `boolean` | `true` | Auto-generate invalidation patterns from path |

```typescript
// Default: auto-invalidate using [firstSegment, firstSegment/*]
invalidationPlugin(); // same as { autoInvalidate: true }

// Disable auto-invalidation (manual only)
invalidationPlugin({ autoInvalidate: false });
```

### Per-Request Options

| Option | Type | Description |
|--------|------|-------------|
| `invalidate` | `string \| string[] \| false \| "*"` | Pattern(s) to invalidate, `false` to disable, or `"*"` for global refetch |

## Default Behavior

When `autoInvalidate: true` (default) and no `invalidate` option is provided:

```typescript
// POST /posts/123/comments
// → Invalidates: ["posts", "posts/*"]

// The first path segment is used to generate patterns:
// - "posts" - exact match for the root
// - "posts/*" - all children under posts
```

## Instance API

The plugin exposes `invalidate` for manual cache invalidation:

```typescript
import { create } from "@spoosh/react";

const { useRead, invalidate } = create(spoosh);

// Single pattern
invalidate("posts");

// Multiple patterns
invalidate(["posts", "users/*"]);

// Global refetch
invalidate("*");

// Useful for external events
socket.on("posts-updated", () => {
  invalidate(["posts", "posts/*"]);
});

socket.on("full-sync", () => {
  invalidate("*");
});
```

## Combining with Cache Plugin

For scenarios like logout, combine with `clearCache` from `@spoosh/plugin-cache`:

```typescript
const { trigger } = useWrite((api) => api("auth/logout").POST());

await trigger({
  clearCache: true,  // Clear all cached data
  invalidate: "*",   // Trigger all queries to refetch
});
```
