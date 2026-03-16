# Spoosh DevTools Extension

Chrome DevTools extension for debugging Spoosh applications.

## Features

- Request/response inspection
- Plugin step tracing
- Cache state viewer
- SSE subscription monitoring
- Import/export traces

## Development

```bash
pnpm dev     # Build with watch
pnpm build   # Production build
```

## Installation

1. Run `pnpm build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Usage

1. Add `devtool()` plugin to your Spoosh client
2. Open Chrome DevTools
3. Navigate to "Spoosh" panel
