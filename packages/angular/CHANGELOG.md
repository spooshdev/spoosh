# @spoosh/angular

## 0.1.0

### Features

- Initial release
- `injectRead` for data fetching with automatic caching and refetching
- `injectWrite` for mutations with loading and error states
- `injectInfiniteRead` for bidirectional paginated data fetching
- Full TypeScript support with inferred types from Spoosh client
- Angular signals integration (`Signal<T>` for all reactive properties)
- Plugin options passthrough (`staleTime`, `retries`, `transform`, etc.)
- `meta()` signal for accessing plugin results (e.g., `transformedData`, `isOptimistic`)
- `enabled` option supports both static boolean and reactive `() => boolean` function
- Automatic cleanup on component destroy
- Proper lifecycle management with `mount`/`unmount` respecting `enabled` state
- Plugin instance APIs (e.g., `prefetch`, `runGc`, `invalidate`) exposed via `createAngularSpoosh`
