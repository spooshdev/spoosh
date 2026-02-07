# @spoosh/plugin-cache

Response caching plugin for Spoosh with configurable stale time.

**[Documentation](https://spoosh.dev/docs/react/plugins/cache)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-cache
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { cachePlugin } from "@spoosh/plugin-cache";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  cachePlugin({ staleTime: 5000 }),
]);

// Per-query override
useRead((api) => api("posts").GET(), { staleTime: 10000 });
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

### Write Options

Clear cache after a mutation completes successfully:

```typescript
const { trigger } = useWrite((api) => api("auth/logout").POST);

// Clear cache after logout
await trigger({ clearCache: true });

// Clear cache + trigger all queries to refetch
await trigger({ clearCache: true, invalidate: "*" });
```

| Option       | Type      | Description                                   |
| ------------ | --------- | --------------------------------------------- |
| `clearCache` | `boolean` | Clear all cached data after mutation succeeds |

## Instance API

The plugin exposes a `clearCache` function for manually clearing all cached data:

```typescript
import { createReactSpoosh } from "@spoosh/react";

const { useRead, clearCache } = createReactSpoosh(client);

// Clear all cached data only (no refetch)
function handleLogout() {
  clearCache();
}

// Clear cache and trigger all queries to refetch
function handleUserSwitch() {
  clearCache({ refetchAll: true });
}
```

| Method                             | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `clearCache()`                     | Clears all cached data without triggering refetch |
| `clearCache({ refetchAll: true })` | Clears cache and triggers all queries to refetch  |
