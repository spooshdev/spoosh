# React E-commerce (Spoosh)

E-commerce demo showcasing Spoosh data layer capabilities.

## Spoosh Features Demonstrated

- **Infinite Scroll** — Paginated product list with `usePages`
- **Search Debounce** — Debounced search input with `debouncePlugin`
- **Hover Prefetch** — Preload product details on hover with `prefetch`
- **Optimistic Updates** — Instant UI feedback for likes, comments, and cart actions
- **Automatic Rollback** — Revert optimistic changes on mutation failure
- **Polling** — Real-time order status updates with `pollingPlugin`
- **Smart Retry** — Retry failed requests on network/5xx errors only
- **Cache & Deduplication** — Efficient data fetching with `cachePlugin` and `deduplicationPlugin`
- **Invalidation** — Targeted cache invalidation after mutations
- **Transform** — Response transformation with `transformPlugin`

## Run

```bash
pnpm --filter @spoosh/example-react-ecommerce dev
```
