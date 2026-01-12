# @spoosh/plugin-optimistic

Optimistic updates plugin for Spoosh - instant UI updates with automatic rollback on error.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`, `@spoosh/plugin-invalidation`

## Installation

```bash
npm install @spoosh/plugin-optimistic @spoosh/plugin-invalidation
```

Note: This plugin requires `@spoosh/plugin-invalidation` as a peer dependency.

> By default, if optimistic updates are used, `autoInvalidate` from `@spoosh/plugin-invalidation` is set to `"none"` to prevent immediate cache invalidation for this request.
> If you want to keep auto-invalidation, set `autoInvalidate` to `"all"` or `"self"` or target with `invalidate` manually.

## Usage

```typescript
import { optimisticPlugin } from "@spoosh/plugin-optimistic";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const plugins = [invalidationPlugin(), optimisticPlugin()];

const { trigger } = useWrite((api) => api.posts[id].$delete);

trigger({
  // Optimistic delete - instantly remove item from list
  optimistic: ($, api) =>
    $({
      for: api.posts.$get,
      updater: (posts) => posts.filter((p) => p.id !== id),
      rollbackOnError: true,
    }),
});

// Optimistic update with response data
trigger({
  optimistic: ($, api) =>
    $({
      for: api.posts.$get,
      timing: "onSuccess",
      updater: (posts, newPost) => [newPost!, ...posts],
    }),
});

// Multiple targets
trigger({
  optimistic: ($, api) => [
    $({
      for: api.posts.$get,
      updater: (posts) => posts.filter((p) => p.id !== id),
    }),
    $({
      for: api.stats.$get,
      updater: (stats) => ({ ...stats, count: stats.count - 1 }),
    }),
  ],
});

// Filter by request params
trigger({
  optimistic: ($, api) =>
    $({
      for: api.posts.$get,
      match: (request) => request.query?.page === 1,
      updater: (posts, newPost) => [newPost!, ...posts],
    }),
});
```

## Options

### Per-Request Options

| Option       | Type                             | Description                           |
| ------------ | -------------------------------- | ------------------------------------- |
| `optimistic` | `($, api) => config \| config[]` | Callback to define optimistic updates |

### Config Object

| Property          | Type                         | Default       | Description                          |
| ----------------- | ---------------------------- | ------------- | ------------------------------------ |
| `for`             | `api.endpoint.$get`          | required      | The endpoint to update               |
| `updater`         | `(data, response?) => data`  | required      | Function to update cached data       |
| `match`           | `(request) => boolean`       | -             | Filter which cache entries to update |
| `timing`          | `"immediate" \| "onSuccess"` | `"immediate"` | When to apply the update (see below) |
| `rollbackOnError` | `boolean`                    | `true`        | Whether to rollback on error         |
| `onError`         | `(error) => void`            | -             | Error callback                       |

### Result

| Property       | Type      | Description                                         |
| -------------- | --------- | --------------------------------------------------- |
| `isOptimistic` | `boolean` | `true` if current data is from an optimistic update |

### Timing Modes

| Mode          | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `"immediate"` | Update cache instantly before request completes. Rollback on error.         |
| `"onSuccess"` | Wait for successful response, then update cache with response data applied. |
