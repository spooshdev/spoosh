# @spoosh/plugin-throttle

Request throttling plugin for Spoosh - limits request frequency.

**[Documentation](https://spoosh.dev/docs/plugins/throttle)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-throttle
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { throttlePlugin } from "@spoosh/plugin-throttle";

const client = new Spoosh<ApiSchema, Error>("/api").use([
  // ...otherPlugins,
  throttlePlugin(),
]);

const { data } = useRead((api) => api.expensive.$get(), { throttle: 1000 });
```

## Options

### Per-Request Options

| Option     | Type     | Description                                                          |
| ---------- | -------- | -------------------------------------------------------------------- |
| `throttle` | `number` | Max 1 request per X milliseconds. Extra requests return cached data. |

## Notes

- Register this plugin at the end of your plugin list, to make sure it block even force fetch requests.
- Unlike debounce (which delays), throttle immediately returns cached data for extra requests
- Useful for rate-limiting expensive endpoints
