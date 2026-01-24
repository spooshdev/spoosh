# @spoosh/plugin-optimistic

## 0.3.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0
- Optimistic target path format changed from nested to flat (e.g., `"posts/:id"`)
- Change optimistic structure to DSL format for better readability

## 0.2.0

### Breaking Changes

- Rename `pluginResult` to `meta` to have consistent naming.
- @spoosh/core now requires at least version 0.5.0, which includes breaking changes.

## 0.1.5

### Patch Changes

- Hotfix for peer dependency versions @spoosh/plugin-invalidation@0.1.0

## 0.1.4

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.1.3

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0
  - @spoosh/plugin-invalidation@1.0.0

## 0.1.2

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.3.0
  - @spoosh/plugin-invalidation@1.0.0

## 0.1.1

### Patch Changes

- Stable release

## 0.1.0-beta.0

### Features

- Initial beta release
- Optimistic updates for mutations
- Automatic rollback on failure
- Customizable optimistic response
- Integration with cache plugin
