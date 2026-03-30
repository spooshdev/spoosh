# @spoosh/devtool

Visual debugging panel for Spoosh. See every request, plugin step, and cached state in your browser's DevTools.

## Installation

### 1. Install the Chrome Extension

Install the [Spoosh DevTools extension](https://chromewebstore.google.com/detail/spoosh-devtools/mcjbgbkoieeebhflnehdbfkidlpkjdhi) from the Chrome Web Store.

### 2. Install the npm package

```bash
npm install @spoosh/devtool
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { devtool } from "@spoosh/devtool";

const client = new Spoosh("/api").use([
  devtool(),
  // other plugins...
]);
```

Open Chrome DevTools and navigate to the "Spoosh" panel to see your requests.

## Features

| Feature               | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| **Request Timeline**  | See every request with timing, status, and duration        |
| **Plugin Steps**      | Watch middleware execution order with before/after diffs   |
| **State Inspector**   | Browse cache entries, subscriber counts, refetch or delete |
| **Event Log**         | View invalidations, refetch triggers, custom plugin events |
| **Status Badges**     | Pending, success, error, stale, fresh indicators           |
| **Filter & Search**   | Filter by operation type, search by path or query key      |
| **Theme Switching**   | Follows Chrome DevTools theme                              |
| **Sensitive Headers** | Toggle to reveal/hide auth headers with eye icon           |
| **Export**            | Save traces as JSON for analysis                           |
| **Settings**          | Max history size, auto-follow, show/hide passed plugins    |

## Options

```typescript
devtool({
  enabled: true,
  sensitiveHeaders: ["authorization", "cookie", "x-api-key"],
  maxHistory: 50,
  maxMessages: 100,
});
```

| Option             | Type       | Default                                         | Description                                |
| ------------------ | ---------- | ----------------------------------------------- | ------------------------------------------ |
| `enabled`          | `boolean`  | `true`                                          | Enable or disable the devtool              |
| `sensitiveHeaders` | `string[]` | `["authorization", "cookie", "x-api-key", ...]` | Headers to redact in UI and exports        |
| `maxHistory`       | `number`   | `50`                                            | Maximum number of traces to keep in memory |
| `maxMessages`      | `number`   | `100`                                           | Maximum messages per SSE subscription      |

## Production

The plugin does nothing when:

- `enabled: false`
- Running on server (SSR)

```typescript
devtool({ enabled: process.env.NODE_ENV === "development" });
```

## Documentation

See [full documentation](https://spoosh.dev/docs/react/devtool) for detailed usage.
