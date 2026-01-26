# @spoosh/plugin-invalidation

## 0.5.0

### Breaking Changes

- Renamed `onResponse` to `afterResponse` to align with core plugin API changes
- Requires `@spoosh/core@>=0.8.0`

## 0.4.0

### Breaking Changes

- Simplified invalidation API: merged `autoInvalidate` and `invalidate` into unified `invalidate` option
- Plugin config: `autoInvalidate` → `defaultMode`
- Per-request: `invalidate` now accepts string mode or array (tags + optional mode keyword)
- Exports: `setAutoInvalidateDefault` → `setDefaultMode`

## 0.3.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0
- Invalidation targets now use flat path syntax

## 0.2.0

### Features

- Expose `invalidate` function to manually invalidate cache entries by api schema or custom tags. (Useful when user want to invalidate cache after certain actions)

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
- Cache invalidation by key patterns
- Automatic invalidation after mutations
- Manual invalidation API
- Tag-based invalidation support
