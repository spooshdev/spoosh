# @spoosh/plugin-refetch

Auto-refetch plugin for Spoosh - refetch on window focus and network reconnect.

**[Documentation](https://spoosh.dev/docs/plugins/refetch)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-refetch
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { refetchPlugin } from "@spoosh/plugin-refetch";

const client = new Spoosh<ApiSchema, Error>("/api").use([
  refetchPlugin({
    refetchOnFocus: true,
    refetchOnReconnect: true,
  }),
]);

// Uses plugin defaults
useRead((api) => api.posts.$get());

// Per-query override
useRead((api) => api.posts.$get(), {
  refetchOnFocus: false, // Disable for this query
});
```

## Options

### Plugin Config

| Option               | Type      | Default | Description                       |
| -------------------- | --------- | ------- | --------------------------------- |
| `refetchOnFocus`     | `boolean` | `false` | Refetch when window regains focus |
| `refetchOnReconnect` | `boolean` | `false` | Refetch when network reconnects   |

### Per-Request Options

| Option               | Type      | Description                         |
| -------------------- | --------- | ----------------------------------- |
| `refetchOnFocus`     | `boolean` | Override focus refetch behavior     |
| `refetchOnReconnect` | `boolean` | Override reconnect refetch behavior |
