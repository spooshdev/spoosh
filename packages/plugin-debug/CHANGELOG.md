# @spoosh/plugin-debug

## 0.2.5

- Updated dependencies
  - @spoosh/core@0.12.0

## 0.2.4

- Updated dependencies
  - @spoosh/core@0.11.1

## 0.2.3

- Changed `PluginContext.path` from `string[]` to `string` for simpler plugin API
- Renamed `PluginContext.requestOptions` to `PluginContext.request` for cleaner API

## 0.2.2

- Use cache state directly insteads of getting state value directly from context

## 0.2.1

- Update documentation URLs to new `/docs/{framework}` format

## 0.2.0

### Breaking Changes

- Renamed `onResponse` to `afterResponse` to align with core plugin API changes
- Requires `@spoosh/core@>=0.8.0`

### Bug Fixes

- Removed direct mutation of `context.response` in favor of passing response as parameter

## 0.1.4

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.1.3

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.3.0

## 0.1.1

### Patch Changes

- Stable release

## 0.1.0-beta.0

### Features

- Initial beta release
- Request/response logging for debugging
- Configurable log levels
- Request timing information
- Error logging with stack traces
- Customizable log format
