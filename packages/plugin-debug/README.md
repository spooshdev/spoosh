# @spoosh/plugin-debug

Debug plugin for Spoosh - logs detailed request lifecycle information.

**[Documentation](https://spoosh.dev/docs/react/plugins/debug)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-debug
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { debugPlugin } from "@spoosh/plugin-debug";

// Basic usage - logs all phases
const spoosh = new Spoosh<ApiSchema, Error>("/api").use([debugPlugin()]);

// With cache logging
const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  debugPlugin({ logCache: true }),
]);

// Custom logger with object shape
const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  debugPlugin({
    logger: (entry) => {
      console.log(entry.phase, entry.path, entry.state.data);
    },
  }),
]);

// Disable in production
const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  debugPlugin({ enabled: process.env.NODE_ENV === "development" }),
]);
```

## Options

### Plugin Config

| Option     | Type                             | Default | Description                         |
| ---------- | -------------------------------- | ------- | ----------------------------------- |
| `enabled`  | `boolean`                        | `true`  | Enable/disable logging              |
| `logCache` | `boolean`                        | `false` | Include cache entries in log output |
| `logger`   | `(entry: DebugLogEntry) => void` | -       | Custom logger function              |

### DebugLogEntry

| Property           | Type       | Description                                |
| ------------------ | ---------- | ------------------------------------------ |
| `phase`            | `string`   | Current phase (onMount, beforeFetch, etc.) |
| `operationType`    | `string`   | "read", "write", or "infiniteRead"         |
| `method`           | `string`   | HTTP method                                |
| `path`             | `string`   | Request path                               |
| `queryKey`         | `string`   | Unique query key                           |
| `requestTimestamp` | `number`   | Request timestamp                          |
| `tags`             | `string[]` | Cache tags                                 |
| `request`          | `unknown`  | Request options                            |
| `state`            | `object`   | Current state (loading, data, error, etc.) |
| `response`         | `object`   | Response data (if available)               |
| `cacheEntries`     | `array`    | Cache entries (if logCache enabled)        |
