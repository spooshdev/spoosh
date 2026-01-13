const RAW_BASE =
  "https://raw.githubusercontent.com/nxnom/spoosh/main/docs/content/docs";

const content = `# Spoosh

> Spoosh is a type-safe API client with a powerful plugin system. Define your API schema once and get full TypeScript autocomplete everywhere.

## Docs

- [Full Docs](https://spoosh.dev/llms-full): Full documentation of all features and plugins.

## Getting Started

- [Overview](${RAW_BASE}/getting-started/index.mdx): Getting started overview
- [Installation](${RAW_BASE}/getting-started/installation.mdx): Install and setup Spoosh
- [First API Call](${RAW_BASE}/getting-started/first-api-call.mdx): Make your first API call

## Core

- [Overview](${RAW_BASE}/core/index.mdx): Core concepts overview
- [Client](${RAW_BASE}/core/client.mdx): Creating and configuring clients
- [Schema Definition](${RAW_BASE}/core/schema-definition.mdx): Define your API schema
- [Response](${RAW_BASE}/core/response.mdx): Response format and handling

## Plugins

- [Overview](${RAW_BASE}/plugins/index.mdx): Plugin system overview

### Data Fetching
- [Cache](${RAW_BASE}/plugins/cache.mdx): In-memory caching with stale-while-revalidate
- [Deduplication](${RAW_BASE}/plugins/deduplication.mdx): Prevent duplicate concurrent requests
- [Prefetch](${RAW_BASE}/plugins/prefetch.mdx): Preload data before navigation
- [Initial Data](${RAW_BASE}/plugins/initial-data.mdx): SSR hydration support

### Mutations
- [Invalidation](${RAW_BASE}/plugins/invalidation.mdx): Auto-refresh queries after mutations
- [Optimistic](${RAW_BASE}/plugins/optimistic.mdx): Optimistic updates for instant UI feedback

### Resilience
- [Retry](${RAW_BASE}/plugins/retry.mdx): Automatic retry with exponential backoff
- [Throttle](${RAW_BASE}/plugins/throttle.mdx): Rate limiting for API calls
- [Debounce](${RAW_BASE}/plugins/debounce.mdx): Debounce rapid requests

### Real-time
- [Polling](${RAW_BASE}/plugins/polling.mdx): Periodic data refresh
- [Refetch](${RAW_BASE}/plugins/refetch.mdx): Refetch on window focus or reconnect

### Framework Integration
- [Next.js](${RAW_BASE}/plugins/nextjs.mdx): Server-side cache revalidation

### Developer Tools
- [Debug](${RAW_BASE}/plugins/debug.mdx): Debug logging for development
`;

export const revalidate = false;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
