# @spoosh/plugin-initial-data

Initial data plugin for Spoosh - show data immediately before fetch completes.

**[Documentation](https://spoosh.dev/docs/plugins/initial-data)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-initial-data
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { initialDataPlugin } from "@spoosh/plugin-initial-data";

const client = new Spoosh<ApiSchema, Error>("/api").use([initialDataPlugin()]);

const { data, isInitialData } = useRead((api) => api.posts.$get(), {
  initialData: prefetchedPosts,
});

const { data } = useRead((api) => api.posts.$get(), {
  initialData: prefetchedPosts,
  refetchOnInitialData: false,
});
```

## Options

### Per-Request Options

| Option                 | Type      | Default | Description                                   |
| ---------------------- | --------- | ------- | --------------------------------------------- |
| `initialData`          | `TData`   | -       | Data to show immediately on first mount       |
| `refetchOnInitialData` | `boolean` | `true`  | Whether to refetch after showing initial data |

### Result

| Property        | Type      | Description                                                |
| --------------- | --------- | ---------------------------------------------------------- |
| `isInitialData` | `boolean` | `true` if currently showing initial data (not yet fetched) |
