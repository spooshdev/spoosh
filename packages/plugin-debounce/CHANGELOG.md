# @spoosh/plugin-debounce

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
