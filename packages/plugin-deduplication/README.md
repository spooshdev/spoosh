# @spoosh/plugin-deduplication

Request deduplication plugin for Spoosh - prevents duplicate in-flight requests.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-deduplication
```

## Usage

```typescript
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";

// Default: dedupe reads, not writes
const plugins = [deduplicationPlugin()];

// Enable deduplication for writes too
// Extreme caution: may cause unintended side effects
// **Avoid using it unless you fully understand the implications**
const plugins = [deduplicationPlugin({ write: "in-flight" })];

// Per-request override
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
