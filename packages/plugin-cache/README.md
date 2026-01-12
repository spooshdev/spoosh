# @spoosh/plugin-cache

Response caching plugin for Spoosh with configurable stale time.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-cache
```

## Usage

```typescript
import { cachePlugin } from "@spoosh/plugin-cache";

const plugins = [
  cachePlugin({ staleTime: 5000 }), // 5 second stale time
];

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
