# @spoosh/core

## 0.14.0

- Add `queue` controller support for queuing multiple requests to the same endpoint.

## 0.13.3

- Fix global `Content-Type` header override `form`, `urlencoded`, and `json` body helpers.

## 0.13.2

- Fix fetch transport return empty object when response is not JSON
- Pending promise now wraps the entire middleware chain to ensure proper handling of async operations in middlewares

## 0.13.1

- Add trigger options to plugin architecture to allow passing custom trigger values

## 0.13.0

- Add devtool tracing support for plugins

## 0.12.1

- Add `priority` option in plugin interface to control execution order of plugins.
- Remove retries logic from core.

## 0.12.0

- Renamed `PluginContext.hookId` to `PluginContext.instanceId` for framework-agnostic terminology.

## 0.11.1

- Rename `metadata` to `temp` in internal plugin communication.

## 0.11.0

### Breaking Changes

- Removed legacy middleware system: `createMiddleware`, `applyMiddlewares`, and `composeMiddlewares` functions have been removed. Use the plugin-based middleware system instead.
- Removed `middlewares` option from `createClient` config. Migrate to plugin-based middleware.
- Changed `createClient` API signature from `createClient(config)` to `createClient(baseUrl, defaultOptions?)` to match the `Spoosh` class style.
- Changed `PluginContext.path` from `string[]` to `string` for simpler plugin API.
- Renamed `PluginContext.requestOptions` to `PluginContext.request` for cleaner API.
- Changed `CreateOperationOptions.path` and `CreateInfiniteReadOptions.path` from `string[]` to `string` for consistency.
- Changed `StateManager.createQueryKey` to accept `path: string` instead of `path: string[]`.

### Other Changes

- Expose `getSubscribersCount` method in listen controllers to get current number of subscribers.
- Remove unnecessary plugin options from plugin context.

## 0.10.1

- Fix invalidation not working properly when using initial data.

## 0.10.0

- Set SpooshSchema `data` as optional field to allow endpoints with no response body
- Introduce `xhr` transport option for custom XMLHttpRequest handling
- Update documentation URLs to new `/docs/{framework}` format

## 0.9.3

- Add `refetchAll` event to reset all listen controllers

## 0.9.2

- Remove `stripTagPrefix` logics and user must use `StripPrefix` utility type to remove prefix from api schema paths

## 0.9.1

- Create `StripPrefix` utility type to remove prefix from api schema paths
- Auto merge duplicate prefix paths when fetching data
- Add `stripTagPrefix` option to prevent unintended tag generation with prefixed paths

## 0.9.0

### Breaking Changes

- Insteads of relying on header or body to determine body type. Now use `form() / json() / urlencoded()` helpers to explicitly set body type.

## 0.8.2

- Fix response override `setMeta` data in first request

## 0.8.1

- Fixed `stale` flag not being set to `false` in controller after successful fetch

## 0.8.0

### Breaking Changes

- Renamed `onResponse` to `afterResponse` in plugin interface
- `afterResponse` now supports return values for response transformation
- Plugins can return new response objects to chain transformations, or return void for side effects only

### Bug Fixes

- Fixed cache timing bug in `createOperationController` where cache was updated before `afterResponse` handlers ran
- Fixed identical cache timing bug in `createInfiniteReadController`
- Cache now correctly stores transformed data instead of original wrapped responses

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

const spoosh = new Spoosh<Schema, Error>("/api").use([cachePlugin()]);
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
