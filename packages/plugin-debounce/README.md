# @spoosh/plugin-debounce

Request debouncing plugin for Spoosh - waits for inactivity before fetching.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-debounce
```

## Usage

```typescript
import { debouncePlugin } from "@spoosh/plugin-debounce";

const plugins = [debouncePlugin()];

// Wait 300ms after typing stops before fetching
const { data } = useRead(
  (api) => api.search.$get({ query: { q: searchTerm } }),
  { debounce: 300 }
);

// Conditional debounce - only debounce when search query changes
const { data } = useRead(
  (api) => api.search.$get({ query: { q: searchTerm, page } }),
  { debounce: ({ prevQuery }) => (prevQuery?.q !== searchTerm ? 300 : 0) }
);
```

## Options

### Per-Request Options

| Option     | Type                            | Description                                                          |
| ---------- | ------------------------------- | -------------------------------------------------------------------- |
| `debounce` | `number \| (context) => number` | Milliseconds to wait, or function receiving previous request context |

### Debounce Function Context

When using a function, you receive:

| Property       | Type      | Description               |
| -------------- | --------- | ------------------------- |
| `prevQuery`    | `object`  | Previous query parameters |
| `prevBody`     | `unknown` | Previous request body     |
| `prevParams`   | `object`  | Previous path parameters  |
| `prevFormData` | `object`  | Previous form data        |
