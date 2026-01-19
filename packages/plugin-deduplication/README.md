# @spoosh/plugin-deduplication

Request deduplication plugin for Spoosh - prevents duplicate in-flight requests.

**[Documentation](https://spoosh.dev/docs/plugins/deduplication)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-deduplication
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";

const client = new Spoosh<ApiSchema, Error>("/api")
  .use([
    deduplicationPlugin(),
  ]);

const client = new Spoosh<ApiSchema, Error>("/api")
  .use([
    deduplicationPlugin({ write: "in-flight" }),
  ]);

useRead((api) => api.posts.$get(), { dedupe: false });
```

## Options

### Plugin Config

| Option  | Type                   | Default       | Description                   |
| ------- | ---------------------- | ------------- | ----------------------------- |
| `read`  | `"in-flight" \| false` | `"in-flight"` | Deduplication mode for reads  |
| `write` | `"in-flight" \| false` | `false`       | Deduplication mode for writes |

### Per-Request Options

| Option   | Type                   | Description                             |
| -------- | ---------------------- | --------------------------------------- |
| `dedupe` | `"in-flight" \| false` | Override deduplication for this request |

### Modes

- `"in-flight"` - Reuse existing in-flight request promise if one exists
- `false` - Always make a new request
