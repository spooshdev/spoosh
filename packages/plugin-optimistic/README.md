# @spoosh/plugin-optimistic

Optimistic updates plugin for Spoosh - instant UI updates with automatic rollback on error.

**[Documentation](https://spoosh.dev/docs/react/plugins/optimistic)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`, `@spoosh/plugin-invalidation`

## Installation

```bash
npm install @spoosh/plugin-optimistic @spoosh/plugin-invalidation
```

Note: This plugin requires `@spoosh/plugin-invalidation` as a peer dependency.

> By default, if optimistic updates are used, `autoInvalidate` from `@spoosh/plugin-invalidation` is set to `"none"` to prevent immediate cache invalidation for this request.
> If you want to keep auto-invalidation, set `autoInvalidate` to `"all"` or `"self"` or target with `invalidate` manually.

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { optimisticPlugin } from "@spoosh/plugin-optimistic";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  invalidationPlugin(),
  optimisticPlugin(),
]);

const { trigger } = useWrite((api) => api("posts/:id").DELETE());

trigger({
  params: { id },
  // Optimistic delete - instantly remove item from list
  optimistic: (cache) =>
    cache("posts").set((posts) => posts.filter((p) => p.id !== id)),
});

// Confirmed update - update cache after successful response
trigger({
  optimistic: (cache) =>
    cache("posts")
      .confirmed()
      .set((posts, newPost) => [newPost, ...posts]),
});

// Both immediate and confirmed updates
trigger({
  optimistic: (cache) =>
    cache("posts")
      .set((posts) => [...posts, { id: -1, title: "Saving..." }])
      .confirmed()
      .set((posts, newPost) => posts.map((p) => (p.id === -1 ? newPost : p))),
});

// Multiple targets
trigger({
  optimistic: (cache) => [
    cache("posts").set((posts) => posts.filter((p) => p.id !== id)),
    cache("stats").set((stats) => ({ ...stats, count: stats.count - 1 })),
  ],
});

// Filter by request params
trigger({
  optimistic: (cache) =>
    cache("posts/:id")
      .filter((entry) => entry.params.id === "1")
      .set((post) => ({ ...post, title: "Updated" })),
});
```

## Options

### Per-Request Options

| Option       | Type                              | Description                           |
| ------------ | --------------------------------- | ------------------------------------- |
| `optimistic` | `(cache) => builder \| builder[]` | Callback to define optimistic updates |

### Builder Methods

Chain methods to configure optimistic updates:

| Method               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `.filter(fn)`        | Filter which cache entries to update            |
| `.set(fn)`           | Update cache (immediate before `.confirmed()`)  |
| `.confirmed()`       | Switch to confirmed mode (update after success) |
| `.disableRollback()` | Disable automatic rollback on error             |
| `.onError(fn)`       | Error callback                                  |

### Result

| Property       | Type      | Description                                         |
| -------------- | --------- | --------------------------------------------------- |
| `isOptimistic` | `boolean` | `true` if current data is from an optimistic update |

### Update Modes

| Usage                          | Description                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `.set(fn)`                     | **Immediate** - Update cache instantly before request completes. Rollback on error.                 |
| `.confirmed().set(fn)`         | **Confirmed** - Wait for successful response, then update cache. `fn` receives response as 2nd arg. |
| `.set(fn).confirmed().set(fn)` | **Both** - Immediate update, then replace with confirmed data on success.                           |
