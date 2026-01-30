# @spoosh/hono

## 0.5.2

- Remove `formData` from request body now it's `body`.

## 0.5.1

- Restore `HonoToSpoosh<T>` to accept `ReturnType<typeof hc<AppType>>` for better compatibility with Hono apps(At least I try :D)
- Remove `HonoRouteToSpoosh`, now `HonoToSpoosh` work for both app and route types

## 0.4.0

- Simplified `HonoToSpoosh<T>` to accept Hono app type directly instead of `ReturnType<typeof hc<AppType>>`

## 0.3.1

- Updated dependencies
  - @spoosh/core@0.9.0

## 0.3.0

- Updated to support new flat schema API from @spoosh/core@0.6.0

## 0.2.4

- Fix homepage URL to point to correct documentation path

## 0.2.3

- Updated dependencies
  - @spoosh/core@0.4.0

## 0.2.2

- Updated dependencies
  - @spoosh/core@0.3.0

## 0.2.0

- Use `hc` return type of Hono handlers to support multiple hono versions
- Use `hc` return type of Hono handlers for better type compatibility

## 0.1.1

- Updated documentation for new `Spoosh` class API

## 0.1.0-beta.0

- Initial beta release
- `HonoToSpoosh` type transformer for converting Hono app types to Spoosh schema
- Full type inference from Hono routes
- Support for all HTTP methods
- Path parameter handling (`:id` → dynamic segments)
- Request body type extraction from zod validators
- Query parameter type extraction
