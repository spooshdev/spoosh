# @spoosh/core

## 0.7.0

### Breaking Changes

**Unified Tags API**

The tags API now follows the same pattern as the invalidation plugin's unified `invalidate` option. This simplifies the API by merging `tags` and `additionalTags` into a single `tags` option that supports modes ('all', 'self', 'none') and arrays.

- Removed `additionalTags` option
- `tags` now accepts `'all' | 'self' | 'none' | string[]` (unified pattern matching invalidation API)

## 0.6.0

### Breaking Changes

- **New Flat Schema API**: Replaced nested schema structure with flat path-based schema
  - Old: `api.posts._.$get()` with `_` wildcard for path params
  - New: `api("posts/:id").GET()` with path string keys
- HTTP methods changed from `$get`, `$post` to `GET`, `POST` format

### Migration

**Before (nested schema):**

```typescript
type ApiSchema = {
  posts: {
    $get: { data: Post[] };
    _: {
      $get: { data: Post };
    };
  };
};

const { data } = await api.posts._.$get({ params: { id: 1 } });
```

**After (flat schema):**

```typescript
type ApiSchema = {
  posts: { GET: { data: Post[] } };
  "posts/:id": { GET: { data: Post } };
};

const { data } = await api("posts/:id").GET({ params: { id: 1 } });
```

### Improvements

- Cleaner path syntax with explicit path parameters in key
- Better TypeScript autocomplete for path strings
- Prevent type deep recursion issues in large schemas

## 0.5.0

### Breaking Changes

- Rename `pluginResult` to `meta` to have consistent naming.

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
