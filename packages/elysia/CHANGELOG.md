# @spoosh/elysia

## 0.3.0

- Direct type infer from Elysia app without relying on Eden Treaty types

## 0.2.1

- Updated dependencies
  - @spoosh/core@0.9.0

## 0.2.0

### Breaking Changes

- Updated to support new flat schema API from @spoosh/core@0.6.0

## 0.1.3

### Patch Changes

- Fix homepage URL to point to correct documentation path

## 0.1.2

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies
  - @spoosh/core@0.3.0

## 0.1.0

### Features

- Initial release
- `ElysiaToSpoosh` type transformer for converting Eden Treaty client types to Spoosh schema
- `ElysiaRouteToSpoosh` type transformer for individual route groups
- Full type inference from Elysia routes
- Support for all HTTP methods (get, post, put, patch, delete)
- Dynamic route handling (callable params → `_` segments)
- Request body type extraction
- Query parameter type extraction
- Error type extraction from Eden Treaty's discriminated union response
