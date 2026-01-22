# @spoosh/core

## 0.4.3

### Patch Changes

- Strict request options types to allow optional value as well.

## 0.4.2

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.4.1

### Patch Changes

- Added internal \_pathTransformer to allow params paths modification

### Bug Fixes

- Fixed createSelectorProxy to convert numeric segments to strings

## 0.4.0

### Breaking Changes

- Remove bracket syntax for dynamic paths

## 0.3.0

### Minor Changes

- - Strict typescript allowing `_` syntax for dynamic path segments

## 0.2.2

### Patch Changes

- Auto convert body to FormData when body contains File or Blob objects

## 0.2.1

### Patch Changes

- Catch errors in onResponse from plugins

## 0.2.0

### Breaking Changes

- Removed `createSpoosh()` function in favor of `Spoosh` class

### Migration

**Before:**

```typescript
import { createSpoosh } from "@spoosh/core";

const plugins = [cachePlugin()] as const;

const client = createSpoosh<Schema, Error, typeof plugins>({
  baseUrl: "/api",
  plugins,
});
```

**After:**

```typescript
import { Spoosh } from "@spoosh/core";

const client = new Spoosh<Schema, Error>("/api").use([cachePlugin()]);
```

### Improvements

- No more `as const` assertion needed for plugins
- No more `typeof plugins` generic parameter
- Cleaner, more intuitive class-based API
- Full type inference preserved

## 0.1.0-beta.0

### Features

- Initial beta release
- Type-safe API client with proxy-based endpoint access
- Plugin middleware system with lifecycle hooks
- State management for request/response tracking
- Event emitter for request lifecycle events
- Support for all HTTP methods (`$get`, `$post`, `$put`, `$patch`, `$delete`)
- Dynamic path segments with bracket notation
- Request body serialization (JSON, FormData, URLEncoded)
- Query string handling
- Header management and merging
