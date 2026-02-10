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

- **Request Timeline** - See every request with timing and status
- **Plugin Steps** - Watch how each plugin processes requests
- **State Inspector** - Browse all cached data
- **Event Log** - View plugin events
- **Export/Import** - Save traces for debugging or sharing

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

## Production

The plugin does nothing when:

- `enabled: false`
- Running on server (SSR)

```typescript
devtool({ enabled: process.env.NODE_ENV === "development" });
```

## Documentation

See [full documentation](https://spoosh.dev/docs/react/plugins/devtool) for detailed usage.
