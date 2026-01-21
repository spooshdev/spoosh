# @spoosh/plugin-throttle

## 0.1.3

- Use `stableKey` insteads of `queryKey` to throttle requests. Now it only check `paths` and `method` not the query params.

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
- Request throttling to limit API call frequency
- Configurable throttle interval
- Per-request throttle options
- Leading/trailing edge configuration
