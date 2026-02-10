# @spoosh/devtool

Visual debugging panel for Spoosh. See every request, plugin step, and cached state in your browser.

## Installation

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

A floating icon appears in the corner. Click it to open the panel.

## Features

| Feature                | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| **Request Timeline**   | See every request with timing, status, and duration                |
| **Plugin Steps**       | Watch middleware execution order with before/after diffs           |
| **State Inspector**    | Browse cache entries, subscriber counts, refetch or delete         |
| **Event Log**          | View invalidations, refetch triggers, custom plugin events         |
| **Status Badges**      | Pending, success, error, stale, fresh indicators                   |
| **Filter & Search**    | Filter by operation type, search by path or query key              |
| **Keyboard Shortcuts** | Navigate with keyboard (Esc, arrows, Ctrl+K, etc.)                 |
| **Resizable Panel**    | Drag to resize sidebar and split panels                            |
| **Theme Switching**    | Dark and light mode                                                |
| **Position Config**    | Button position (corners) and sidebar position (right/left/bottom) |
| **Sensitive Headers**  | Toggle to reveal/hide auth headers with eye icon                   |
| **Export/Import**      | Save traces as JSON, import for analysis                           |
| **Settings**           | Max history size, auto-follow, show/hide passed plugins            |

## Options

```typescript
devtool({
  enabled: true, // Turn off in production
  showFloatingIcon: true, // Hide icon, use toggle() instead
  sensitiveHeaders: [
    // Headers to redact (defaults below)
    "authorization",
    "cookie",
    "x-api-key",
  ],
});
```

## Programmatic API

```typescript
const { devtools } = create(client);

devtools.toggle(); // Open/close panel
devtools.clearTraces(); // Clear history
devtools.exportTraces(); // Get traces as JSON
devtools.toggleFloatingIcon(); // Show/hide floating icon
```

## Keyboard Shortcuts

| Shortcut        | Action         |
| --------------- | -------------- |
| `Esc`           | Close panel    |
| `Ctrl/Cmd + K`  | Focus search   |
| `↑` / `↓`       | Navigate items |
| `1` / `2` / `3` | Switch views   |
| `Ctrl/Cmd + E`  | Export traces  |
| `Ctrl/Cmd + L`  | Clear traces   |

## Production

The plugin does nothing when:

- `enabled: false`
- Running on server (SSR)

```typescript
devtool({ enabled: process.env.NODE_ENV === "development" });
```

## Documentation

See [full documentation](https://spoosh.dev/docs/react/devtool) for detailed usage.
