# @spoosh/react

## 0.3.0

### Breaking Changes

- Rename `pluginResult` to `meta` to have consistent naming.
- @spoosh/core now requires at least version 0.5.0, which includes breaking changes.

## 0.2.3

### Patch Changes

- Strict request options types to allow optional value as well.

## 0.2.2

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.2.1

- Fix `useRead` allow passing extra properties to config

## 0.2.0

### Minor Changes

- Change core package as peer dependencies

## Breaking Changes

- Move plugin returned data to `meta` field in hook return object.

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.1.4

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.3.0

## 0.1.3

### Patch Changes

- Fix initial loading state false in infinite queries.

## 0.1.2

### Patch Changes

- Fix loading state doesn't respect cache entry.
- Updated dependencies
  - @spoosh/core@0.2.1

## 0.1.1

### Patch Changes

- Updated documentation for new `Spoosh` class API

## 0.1.0-beta.0

### Features

- Initial beta release
- `useRead` hook for data fetching with automatic caching and refetching
- `useWrite` hook for mutations with loading and error states
- `useInfiniteRead` hook for bidirectional paginated data fetching
- Full TypeScript support with inferred types from Spoosh client
- Plugin options passthrough (`staleTime`, `retries`, etc.)
- Automatic abort on unmount
- `enabled` option for conditional fetching
