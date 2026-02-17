# @spoosh/plugin-qs

## 0.4.0

- Support `queue` operation type

## 0.3.0

- Add devtool tracing support

## 0.2.5

- Updated dependencies
  - @spoosh/core@0.12.0

## 0.2.4

- Updated dependencies
  - @spoosh/core@0.11.1

## 0.2.3

- Renamed `PluginContext.requestOptions` to `PluginContext.request` for cleaner API

## 0.2.2

- Update documentation URLs to new `/docs/{framework}` format

## 0.2.1

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.2.0

### Breaking Changes

- Pass `qs` options directly to request options insteads of nesting under `config`
- Per-request `qs` options must be pass in `qs` property of request options

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
- Advanced query string serialization
- Support for nested objects and arrays
- Configurable array format (brackets, indices, repeat)
- Custom encoder support
