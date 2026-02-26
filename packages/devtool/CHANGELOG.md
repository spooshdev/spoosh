# @spoosh/devtool

## 0.5.0

- Update for core plugin API rename (`exports` → `internal`, `instanceApi` → `api`)

## 0.4.0

- Support SSE event tracing in devtool.

## 0.3.0

- Update for `pages` operation type rename

## 0.2.0

- Support `queue` requests in devtool.

## 0.1.4

- Fix `FormData` is not displaying as `form` in request view.
- Sanatize `base64` images when exporting traces to save space and improve readability.

## 0.1.3

- Add `container` mode for devtool panel to be rendered inside a specific DOM element
- Hide `infinite-tracker` helper state in devtool state view
- Fix request query params not showing correctly in state/import view
- Fix params not resolving correctly in event view
- Improve UI for better readability

## 0.1.2

- Use LCS algorithm to display diff for better readability

## 0.1.1

- Fix new requests count in FAB disappearing after max history hit the limit
- Fix abort requests are display as error in devtool
- Fix state view not resolving dynamic param values

## 0.1.0

- Initial release
- Floating devtool panel with request/response visualization
- Plugin execution timeline with step-by-step tracing
- Request/response data inspection with tabs (Data, Request, Meta, Plugins)
- Cache state visualization and invalidation tracking
- Lifecycle event monitoring (onMount, onUpdate, onUnmount)
- Sensitive header masking with configurable patterns
- Keyboard navigation support for devtool panel
- Export traces functionality for debugging
- Dark theme with customizable styles
