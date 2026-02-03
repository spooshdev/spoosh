# @spoosh/plugin-cache

## 0.2.3

- Emit `refetchAll` event when cache is cleared

## 0.2.2

### Bug Fixes

- Fixed cache timing bug where raw responses were cached before `afterResponse` handlers could transform them
- Requires `@spoosh/core@>=0.8.0`

## 0.2.1

### Patch Changes

- Update documentation examples to use new flat schema syntax

## 0.2.0

### Features

- Expose `clearCache` method to manually clear the cache. (Useful when you logout or switch user)

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
- Response caching with configurable stale time
- Cache key generation from request path and options
- `staleTime` option for cache duration
- `cacheKey` option for custom cache keys
- Cache invalidation support
- Memory-efficient cache storage
