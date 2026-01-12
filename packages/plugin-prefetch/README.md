# @spoosh/plugin-prefetch

Prefetch plugin for Spoosh - preload data before it's needed.

**Requirements:** TypeScript >= 5.0
**Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-prefetch
```

## Usage

```typescript
import { prefetchPlugin } from "@spoosh/plugin-prefetch";

// Setup - prefetch is returned from createReactSpoosh
const plugins = [prefetchPlugin(), cachePlugin(), retryPlugin()];
const spoosh = createSpoosh<ApiSchema, Error, typeof plugins>({ baseUrl: "/api", plugins });
const { useRead, useWrite, prefetch } = createReactSpoosh(spoosh);

// Basic prefetch
await prefetch((api) => api.posts.$get());

// Prefetch with query options
await prefetch((api) => api.posts.$get({ query: { page: 1, limit: 10 } }));

// Prefetch with plugin options (staleTime, retries, etc.)
await prefetch(
  (api) => api.users[userId].$get(),
  {
    staleTime: 60000,
    retries: 3,
  }
);

// Prefetch on hover
<Link
  href="/posts/1"
  onMouseEnter={() => prefetch((api) => api.posts[1].$get())}
>
  View Post
</Link>
```

## Options

### Plugin Config

| Option      | Type     | Default | Description                                 |
| ----------- | -------- | ------- | ------------------------------------------- |
| `staleTime` | `number` | -       | Default stale time for prefetched data (ms) |

### Prefetch Options

The second argument to `prefetch()` accepts any plugin options (staleTime, retries, dedupe, etc.) plus:

| Option           | Type       | Description               |
| ---------------- | ---------- | ------------------------- |
| `tags`           | `string[]` | Custom cache tags         |
| `additionalTags` | `string[]` | Additional tags to append |
