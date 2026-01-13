# @spoosh/plugin-polling

Automatic polling/refetching plugin for Spoosh.

**[Documentation](https://spoosh.dev/docs/plugins/polling)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-polling
```

## Usage

```typescript
import { pollingPlugin } from "@spoosh/plugin-polling";

const plugins = [pollingPlugin()];

// Static polling interval (5 seconds)
useRead((api) => api.posts.$get(), { pollingInterval: 5000 });

// Disable polling (Default behavior)
useRead((api) => api.posts.$get(), { pollingInterval: false });

// Dynamic polling interval based on data/error
useRead((api) => api.booking[123].$get(), {
  pollingInterval: (data, error) => {
    if (error) return 10000; // Slower polling on error
    if (data?.status === "pending") return 1000; // Fast polling for pending
    return 5000; // Normal polling
  },
});
```

## Options

### Per-Request Options

| Option            | Type                                                  | Description                                                                               |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pollingInterval` | `number \| false \| (data, error) => number \| false` | Polling interval in milliseconds, `false` to disable, or a function for dynamic intervals |

## Dynamic Polling

The polling interval can be a function that receives the current data and error, allowing you to adjust the polling rate based on the response:

```typescript
useRead((api) => api.jobs(":id").$get({ id: jobId }), {
  pollingInterval: (data) => {
    // Stop polling when job is complete
    if (data?.status === "completed") return false;

    // Poll faster while job is running
    if (data?.status === "running") return 1000;

    // Default interval
    return 5000;
  },
});
```
