# @spoosh/plugin-throttle

Request throttling plugin for Spoosh - limits request frequency.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-throttle
```

## Usage

```typescript
import { throttlePlugin } from "@spoosh/plugin-throttle";

const plugins = [
  // ...otherPlugins,
  throttlePlugin(), // register at end to block even force fetches
];

// Max 1 request per second - extras return cached data
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
