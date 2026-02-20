# @spoosh/plugin-retry

Automatic retry plugin for Spoosh with configurable attempts and delay.

**[Documentation](https://spoosh.dev/docs/react/plugins/retry)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-retry
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { retryPlugin } from "@spoosh/plugin-retry";

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([
  retryPlugin({ retries: 3, retryDelay: 1000 }),
]);

// Per-query override
useRead((api) => api("posts").GET(), {
  retry: { retries: 5, delay: 2000 },
});

// Disable retries for a specific request
useRead((api) => api("posts").GET(), {
  retry: { retries: false },
});
```

## Retry Behavior

By default, the plugin retries on:

- **Network errors** - Always retried (cannot be disabled via `shouldRetry`)
- **Status codes** - `408`, `429`, `500`, `502`, `503`, `504`

### Custom Retry Logic

Use the `shouldRetry` callback for custom retry conditions:

```typescript
retryPlugin({
  retries: 3,
  shouldRetry: ({ status, error, attempt, maxRetries }) => {
    // Only retry on 503 Service Unavailable
    return status === 503;
  },
});

// Per-request override
useRead((api) => api("posts").GET(), {
  retry: {
    shouldRetry: ({ status }) => status === 429,
  },
});
```

> **Note:** Network errors are always retried regardless of the `shouldRetry` callback return value.

## Options

### Plugin Config

| Option        | Type                  | Default                                 | Description                                                      |
| ------------- | --------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `retries`     | `number \| false`     | `3`                                     | Number of retry attempts. Set to `false` to disable retries.     |
| `retryDelay`  | `number`              | `1000`                                  | Delay between retries in milliseconds (uses exponential backoff) |
| `shouldRetry` | `ShouldRetryCallback` | Retries on 408, 429, 500, 502, 503, 504 | Custom callback to determine if a request should be retried      |

### Per-Request Options

Pass options via the `retry` object:

| Option        | Type                  | Description                              |
| ------------- | --------------------- | ---------------------------------------- |
| `retries`     | `number \| false`     | Override retry attempts for this request |
| `delay`       | `number`              | Override retry delay for this request    |
| `shouldRetry` | `ShouldRetryCallback` | Override retry logic for this request    |

### ShouldRetryContext

The `shouldRetry` callback receives a context object:

| Property     | Type      | Description                          |
| ------------ | --------- | ------------------------------------ |
| `status`     | `number?` | HTTP status code from the response   |
| `error`      | `unknown` | The error that occurred              |
| `attempt`    | `number`  | Current attempt number (0-indexed)   |
| `maxRetries` | `number`  | Maximum number of retries configured |
