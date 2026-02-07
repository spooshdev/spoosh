# @spoosh/plugin-debounce

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

- Update documentation URLs to new `/docs/{framework}` format

## 0.2.1

- Cleanup timers on unmount to prevent memory leaks

## 0.2.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0
- Remove `prevBody` and `prevFormData` from conditional debounce options

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
- Request debouncing to prevent rapid-fire API calls
- Configurable debounce delay
- Per-request debounce options
- Automatic cleanup on abort
