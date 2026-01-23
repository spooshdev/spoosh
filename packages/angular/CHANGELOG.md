# @spoosh/angular

## 0.2.0

### Breaking Changes

- Rename `pluginResult` to `meta` to have consistent naming.
- @spoosh/core now requires at least version 0.5.0, which includes breaking changes.

## 0.1.4

### Bug Fixes

- Strict request options types to allow optional value as well.
- Fix `injectWrite` does not re-evaluate selector when dynamic signal update
- Fix `injectInfiniteRead` run even when `enabled` is false
- Fix lazy loading not working correctly.

## 0.1.3

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.1.2

- Fix allowing invalid properties in `injectInfiniteRead` options.

## 0.1.1

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.1.0

### Features

- Initial release
- `injectRead` for data fetching with automatic caching and refetching
- `injectWrite` for mutations with loading and error states
- `injectInfiniteRead` for bidirectional paginated data fetching
- Full TypeScript support with inferred types from Spoosh client
- Angular signals integration (`Signal<T>` for all reactive properties)
- Plugin options passthrough (`staleTime`, `retries`, `transform`, etc.)
- `meta()` signal for accessing plugin results (e.g., `transformedData`, `isOptimistic`)
- `enabled` option supports both static boolean and reactive `() => boolean` function
- Automatic cleanup on component destroy
- Proper lifecycle management with `mount`/`unmount` respecting `enabled` state
- Plugin instance APIs (e.g., `prefetch`, `runGc`, `invalidate`) exposed via `createAngularSpoosh`
