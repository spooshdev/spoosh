# Angular E-commerce (Spoosh)

E-commerce demo showcasing the Spoosh data layer with `@spoosh/angular` —
built with standalone components, signals, the new control flow (`@if`, `@for`,
`@switch`), `input()` route bindings, and `output()`.

It mirrors the [`react-ecommerce`](../react-ecommerce) example feature-for-feature,
so you can compare the exact same app across both frameworks.

## Spoosh Features Demonstrated

- **Reactive reads** — `injectRead` re-runs automatically when a signal it
  reads (page number, route id) changes
- **Optimistic updates** — instant UI feedback for likes, comments, and cart
  actions, with automatic rollback on failure
- **Automatic invalidation** — mutations invalidate related queries by path tag
- **Polling** — order status refreshes every 2s until paid (`pollingPlugin`)
- **Hover prefetch** — preload product details on hover with `prefetch`
- **Transform** — derived cart totals via `transformPlugin` (`meta().transformedData`)
- **Smart retry** — retry failed requests on 5xx only
- **Cache & deduplication** — efficient fetching with `cachePlugin` and
  `deduplicationPlugin`

## Mocking

API requests are mocked in the browser with [MSW](https://mswjs.io), so no
backend is required. The worker script lives in `public/mockServiceWorker.js`.
If it ever goes missing, regenerate it:

```bash
pnpm --filter @spoosh/example-angular-ecommerce msw:init
```

## Run

```bash
pnpm --filter @spoosh/example-angular-ecommerce dev
```

Then open the printed local URL (defaults to http://localhost:4204).
