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
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => posts.filter((p) => p.id !== id)),
});

// Optimistic update with response data (onSuccess timing)
trigger({
  optimistic: (api) =>
    api("posts")
      .GET()
      .ON_SUCCESS()
      .UPDATE_CACHE((posts, newPost) => [newPost!, ...posts]),
});

// Multiple targets
trigger({
  optimistic: (api) => [
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => posts.filter((p) => p.id !== id)),
    api("stats")
      .GET()
      .UPDATE_CACHE((stats) => ({ ...stats, count: stats.count - 1 })),
  ],
});

// Filter by request params
trigger({
  optimistic: (api) =>
    api("posts")
      .GET()
      .WHERE((request) => request.query?.page === 1)
      .UPDATE_CACHE((posts, newPost) => [newPost!, ...posts]),
});
```

## Options

### Per-Request Options

| Option       | Type                            | Description                           |
| ------------ | ------------------------------- | ------------------------------------- |
| `optimistic` | `(api) => builder \| builder[]` | Callback to define optimistic updates |

### Builder Methods (DSL)

Chain methods to configure optimistic updates:

| Method              | Description                               |
| ------------------- | ----------------------------------------- |
| `.GET()`            | Select the GET endpoint to update         |
| `.WHERE(fn)`        | Filter which cache entries to update      |
| `.UPDATE_CACHE(fn)` | Update cache immediately (default timing) |
| `.ON_SUCCESS()`     | Switch to onSuccess timing mode           |
| `.NO_ROLLBACK()`    | Disable automatic rollback on error       |
| `.ON_ERROR(fn)`     | Error callback                            |

### Result

| Property       | Type      | Description                                         |
| -------------- | --------- | --------------------------------------------------- |
| `isOptimistic` | `boolean` | `true` if current data is from an optimistic update |

### Timing Modes

| Usage                            | Description                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.UPDATE_CACHE(fn)`              | **Immediate** - Update cache instantly before request completes. Rollback on error.                  |
| `.ON_SUCCESS().UPDATE_CACHE(fn)` | **On Success** - Wait for successful response, then update cache. `fn` receives response as 2nd arg. |
