# @spoosh/angular

## 0.6.5

- Updated dependencies
  - @spoosh/core@0.12.0

## 0.6.4

- Updated dependencies
  - @spoosh/core@0.11.1

## 0.6.3

- Changed `PluginContext.path` from `string[]` to `string` for simpler plugin API
- Renamed `PluginContext.requestOptions` to `PluginContext.request` for cleaner API

## 0.6.2

- Update documentation URLs to new `/docs/{framework}` format

## 0.6.1

- Handle `refetchAll` event in read injectors to trigger refetching when cache is cleared

## 0.6.0

- Remove `injectLazyRead` hook and now `injectRead` trigger support passing custom options

## 0.5.0

- Rename `refetch` with `trigger` in `injectRead` and `injectInfiniteRead` hooks for consistency
- Remove `reset` function for simplier api

## 0.4.0

### Breaking Changes

- Updated for @spoosh/core@0.7.0 unified tags API
- Removed `additionalTags` option (use `tags` array instead)

## 0.3.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0
- Inject selectors now use flat path syntax: `api => api("posts/:id").GET()`

### Migration

**Before:**

```typescript
const data = injectRead((api) => api.posts._.$get({ params: { id } }));
```

**After:**

```typescript
const data = injectRead((api) => api("posts/:id").GET({ params: { id } }));
```

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
