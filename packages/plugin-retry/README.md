# @spoosh/plugin-retry

Automatic retry plugin for Spoosh with configurable attempts and delay.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-retry
```

## Usage

```typescript
import { retryPlugin } from "@spoosh/plugin-retry";

const plugins = [
  retryPlugin({ retries: 3, retryDelay: 1000 }), // 3 retries with 1 second delay
];

// Per-query override
useRead((api) => api.posts.$get(), { retries: 5, retryDelay: 2000 });

// Disable retries for a specific request
useRead((api) => api.posts.$get(), { retries: false });
```

## Options

### Plugin Config

| Option       | Type              | Default | Description                                                  |
| ------------ | ----------------- | ------- | ------------------------------------------------------------ |
| `retries`    | `number \| false` | `3`     | Number of retry attempts. Set to `false` to disable retries. |
| `retryDelay` | `number`          | `1000`  | Delay between retries in milliseconds                        |

### Per-Request Options

| Option       | Type              | Description                              |
| ------------ | ----------------- | ---------------------------------------- |
| `retries`    | `number \| false` | Override retry attempts for this request |
| `retryDelay` | `number`          | Override retry delay for this request    |
