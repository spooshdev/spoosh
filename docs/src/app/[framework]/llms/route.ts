import { type Framework } from "@/lib/source";

const REACT_RAW_BASE =
  "https://raw.githubusercontent.com/nxnom/spoosh/main/docs/content/react";
const ANGULAR_RAW_BASE =
  "https://raw.githubusercontent.com/nxnom/spoosh/main/docs/content/angular";

const reactContent = `# Spoosh React

> Spoosh is a type-safe API client with a powerful plugin system. Define your API schema once and get full TypeScript autocomplete everywhere.

## Docs

- [Full Docs](https://spoosh.dev/react/llms-full): Full React documentation.

## Getting Started

- [Overview](${REACT_RAW_BASE}/getting-started/index.mdx): Getting started overview
- [Installation](${REACT_RAW_BASE}/getting-started/installation.mdx): Install and setup Spoosh
- [First API Call](${REACT_RAW_BASE}/getting-started/first-api-call.mdx): Make your first API call

## Core

- [Overview](${REACT_RAW_BASE}/core/index.mdx): Core concepts overview
- [Client](${REACT_RAW_BASE}/core/client.mdx): Creating and configuring clients
- [Schema Definition](${REACT_RAW_BASE}/core/schema-definition.mdx): Define your API schema
- [Response](${REACT_RAW_BASE}/core/response.mdx): Response format and handling

## Hooks

- [Overview](${REACT_RAW_BASE}/hooks/index.mdx): React hooks overview
- [useRead](${REACT_RAW_BASE}/hooks/use-read.mdx): Fetch data with automatic caching
- [useWrite](${REACT_RAW_BASE}/hooks/use-write.mdx): Trigger mutations
- [useInfiniteRead](${REACT_RAW_BASE}/hooks/use-infinite-read.mdx): Paginated data fetching

## Integrations

- [Hono](${REACT_RAW_BASE}/integrations/hono.mdx): Hono server type adapter
- [Elysia](${REACT_RAW_BASE}/integrations/elysia.mdx): Elysia server type adapter
- [OpenAPI](${REACT_RAW_BASE}/integrations/openapi.mdx): Bidirectional OpenAPI conversion

## Plugins

- [Overview](${REACT_RAW_BASE}/plugins/index.mdx): Plugin system overview

### Data Fetching
- [Cache](${REACT_RAW_BASE}/plugins/cache.mdx): In-memory caching with stale-while-revalidate
- [Deduplication](${REACT_RAW_BASE}/plugins/deduplication.mdx): Prevent duplicate concurrent requests
- [Prefetch](${REACT_RAW_BASE}/plugins/prefetch.mdx): Preload data before navigation
- [Initial Data](${REACT_RAW_BASE}/plugins/initial-data.mdx): SSR hydration support
- [GC](${REACT_RAW_BASE}/plugins/gc.mdx): Garbage collection for cache management

### Mutations
- [Invalidation](${REACT_RAW_BASE}/plugins/invalidation.mdx): Auto-refresh queries after mutations
- [Optimistic](${REACT_RAW_BASE}/plugins/optimistic.mdx): Optimistic updates for instant UI feedback

### Resilience
- [Retry](${REACT_RAW_BASE}/plugins/retry.mdx): Automatic retry with exponential backoff
- [Throttle](${REACT_RAW_BASE}/plugins/throttle.mdx): Rate limiting for API calls
- [Debounce](${REACT_RAW_BASE}/plugins/debounce.mdx): Debounce rapid requests

### Real-time
- [Polling](${REACT_RAW_BASE}/plugins/polling.mdx): Periodic data refresh
- [Refetch](${REACT_RAW_BASE}/plugins/refetch.mdx): Refetch on window focus or reconnect

### Data Transformation
- [Path Case](${REACT_RAW_BASE}/plugins/path-case.mdx): Write camelCase in TypeScript, send kebab-case to API
- [Transform](${REACT_RAW_BASE}/plugins/transform.mdx): Transform request and response data
- [QS](${REACT_RAW_BASE}/plugins/qs.mdx): Query string serialization for nested objects

### Framework Integration
- [Next.js](${REACT_RAW_BASE}/plugins/nextjs.mdx): Server-side cache revalidation

### Developer Tools
- [Debug](${REACT_RAW_BASE}/plugins/debug.mdx): Debug logging for development
`;

const angularContent = `# Spoosh Angular

> Spoosh is a type-safe API client with a powerful plugin system. Define your API schema once and get full TypeScript autocomplete everywhere.

## Docs

- [Full Docs](https://spoosh.dev/angular/llms-full): Full Angular documentation.

## Getting Started

- [Overview](${ANGULAR_RAW_BASE}/getting-started/index.mdx): Getting started overview
- [Installation](${ANGULAR_RAW_BASE}/getting-started/installation.mdx): Install and setup Spoosh
- [First API Call](${ANGULAR_RAW_BASE}/getting-started/first-api-call.mdx): Make your first API call

## Core

- [Overview](${ANGULAR_RAW_BASE}/core/index.mdx): Core concepts overview
- [Client](${ANGULAR_RAW_BASE}/core/client.mdx): Creating and configuring clients
- [Schema Definition](${ANGULAR_RAW_BASE}/core/schema-definition.mdx): Define your API schema
- [Response](${ANGULAR_RAW_BASE}/core/response.mdx): Response format and handling

## Injects

- [Overview](${ANGULAR_RAW_BASE}/injects/index.mdx): Angular inject functions overview
- [injectRead](${ANGULAR_RAW_BASE}/injects/inject-read.mdx): Fetch data with Signals
- [injectWrite](${ANGULAR_RAW_BASE}/injects/inject-write.mdx): Trigger mutations
- [injectInfiniteRead](${ANGULAR_RAW_BASE}/injects/inject-infinite-read.mdx): Paginated data fetching

## Integrations

- [Hono](${ANGULAR_RAW_BASE}/integrations/hono.mdx): Hono server type adapter
- [Elysia](${ANGULAR_RAW_BASE}/integrations/elysia.mdx): Elysia server type adapter
- [OpenAPI](${ANGULAR_RAW_BASE}/integrations/openapi.mdx): Bidirectional OpenAPI conversion

## Plugins

- [Overview](${ANGULAR_RAW_BASE}/plugins/index.mdx): Plugin system overview

### Data Fetching
- [Cache](${ANGULAR_RAW_BASE}/plugins/cache.mdx): In-memory caching with stale-while-revalidate
- [Deduplication](${ANGULAR_RAW_BASE}/plugins/deduplication.mdx): Prevent duplicate concurrent requests
- [Prefetch](${ANGULAR_RAW_BASE}/plugins/prefetch.mdx): Preload data before navigation
- [Initial Data](${ANGULAR_RAW_BASE}/plugins/initial-data.mdx): SSR hydration support
- [GC](${ANGULAR_RAW_BASE}/plugins/gc.mdx): Garbage collection for cache management

### Mutations
- [Invalidation](${ANGULAR_RAW_BASE}/plugins/invalidation.mdx): Auto-refresh queries after mutations
- [Optimistic](${ANGULAR_RAW_BASE}/plugins/optimistic.mdx): Optimistic updates for instant UI feedback

### Resilience
- [Retry](${ANGULAR_RAW_BASE}/plugins/retry.mdx): Automatic retry with exponential backoff
- [Throttle](${ANGULAR_RAW_BASE}/plugins/throttle.mdx): Rate limiting for API calls
- [Debounce](${ANGULAR_RAW_BASE}/plugins/debounce.mdx): Debounce rapid requests

### Real-time
- [Polling](${ANGULAR_RAW_BASE}/plugins/polling.mdx): Periodic data refresh
- [Refetch](${ANGULAR_RAW_BASE}/plugins/refetch.mdx): Refetch on window focus or reconnect

### Data Transformation
- [Path Case](${ANGULAR_RAW_BASE}/plugins/path-case.mdx): Write camelCase in TypeScript, send kebab-case to API
- [Transform](${ANGULAR_RAW_BASE}/plugins/transform.mdx): Transform request and response data
- [QS](${ANGULAR_RAW_BASE}/plugins/qs.mdx): Query string serialization for nested objects

### Developer Tools
- [Debug](${ANGULAR_RAW_BASE}/plugins/debug.mdx): Debug logging for development
`;

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ framework: string }> }
) {
  const { framework } = await params;
  const content = framework === "angular" ? angularContent : reactContent;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
    },
  });
}

export function generateStaticParams(): { framework: Framework }[] {
  return [{ framework: "react" }, { framework: "angular" }];
}
