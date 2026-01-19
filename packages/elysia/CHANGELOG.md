# @spoosh/elysia

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
