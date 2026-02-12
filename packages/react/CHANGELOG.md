# @spoosh/react

## 0.10.0

### Breaking Changes

- Update useWrite to split hook-level and trigger-level options for proper type inference

### Migration

**Before:**

```typescript
const { trigger } = useWrite((api) => api.posts.POST);
```

**After:**

```typescript
const { trigger } = useWrite((api) => api.posts.POST(), {
  // hook-level options here
});

trigger({
  // trigger-level options here
});
```

This allow same write hook to have similar api like `useRead` with hook-level options,
while still allowing passing custom options when triggering the write.

## 0.9.0

- Add devtool tracing support

## 0.8.0

- Rename awkward `createReactSpoosh` to `create` for simpler import

## 0.7.5

- Updated dependencies
  - @spoosh/core@0.12.0

## 0.7.4

- Updated dependencies
  - @spoosh/core@0.11.1

## 0.7.3

- Changed `PluginContext.path` from `string[]` to `string` for simpler plugin API

## 0.7.2

- Update documentation URLs to new `/docs/{framework}` format

## 0.7.1

- Handle `refetchAll` event in read hooks to trigger refetching when cache is cleared

## 0.7.0

- Remove `useLazyRead` hook and now `useRead` trigger support passing custom options

## 0.6.0

- Rename `refetch` with `trigger` in `useRead` and `useInfiniteRead` hooks for consistency
- Remove `reset` function for simplier api

## 0.5.1

- Improve type inference for meta field with overloaded hooks
- Fix changing tags not update the tag keys properly in cache

## 0.5.0

### Breaking Changes

- Updated for @spoosh/core@0.7.0 unified tags API
- Removed `additionalTags` option (use `tags` array instead)

## 0.4.1

### Patch Changes

- Update documentation examples to use new flat schema syntax

## 0.4.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0
- Hook selectors now use flat path syntax: `api => api("posts/:id").GET()`

### Migration

**Before:**

```typescript
const { data } = useRead((api) => api.posts._.$get({ params: { id } }));
```

**After:**

```typescript
const { data } = useRead((api) => api("posts/:id").GET({ params: { id } }));
```

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
