# @spoosh/plugin-cache

Response caching plugin for Spoosh with configurable stale time.

**[Documentation](https://spoosh.dev/docs/plugins/cache)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-cache
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";

const client = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
]);

// Per-query override
useRead((api) => api.posts.$get(), { staleTime: 10000 });
```

## Options

### Plugin Config

| Option      | Type     | Default | Description                        |
| ----------- | -------- | ------- | ---------------------------------- |
| `staleTime` | `number` | `0`     | Default stale time in milliseconds |

### Per-Request Options

| Option      | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `staleTime` | `number` | Override stale time for this request |

## Instance API

The plugin exposes a `clearCache` function for manually clearing all cached data:

```typescript
import { createReactSpoosh } from "@spoosh/react";

const { useRead, clearCache } = createReactSpoosh(client);

// Clear all cached data (e.g., on logout or user switch)
function handleLogout() {
  clearCache();
}
```

| Method       | Description                                             |
| ------------ | ------------------------------------------------------- |
| `clearCache` | Clears all cached data. Useful for logout/user switching |
