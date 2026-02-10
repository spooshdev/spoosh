import { GITHUB_URL } from "@/lib/constants";
import { type Framework } from "@/lib/source";

const RAW_BASE =
  GITHUB_URL.replace("github.com", "raw.githubusercontent.com") +
  "/main/docs/content";

function generateContent(framework: "react" | "angular"): string {
  const RAW_BASE_PATH = `${RAW_BASE}/${framework}`;
  const title = framework === "react" ? "React" : "Angular";
  const hookType = framework === "react" ? "Hooks" : "Injects";

  const hooksOrInjectsSection =
    framework === "react"
      ? `## Hooks

- [Overview](${RAW_BASE_PATH}/hooks/index.mdx): React hooks overview
- [useRead](${RAW_BASE_PATH}/hooks/use-read.mdx): Fetch data with automatic caching
- [useWrite](${RAW_BASE_PATH}/hooks/use-write.mdx): Trigger mutations
- [useInfiniteRead](${RAW_BASE_PATH}/hooks/use-infinite-read.mdx): Paginated data fetching`
      : `## Injects

- [Overview](${RAW_BASE_PATH}/injects/index.mdx): Angular inject functions overview
- [injectRead](${RAW_BASE_PATH}/injects/inject-read.mdx): Fetch data with Signals
- [injectWrite](${RAW_BASE_PATH}/injects/inject-write.mdx): Trigger mutations
- [injectInfiniteRead](${RAW_BASE_PATH}/injects/inject-infinite-read.mdx): Paginated data fetching`;

  const infiniteQueryHook =
    framework === "react" ? "useInfiniteRead" : "injectInfiniteRead";

  return `# Spoosh ${title}

> Spoosh is a type-safe API toolkit with a powerful plugin system. Define your API schema once and get full TypeScript autocomplete everywhere.

## Docs

- [Full Docs](https://spoosh.dev/docs/${framework}/llms-full): Full ${title} documentation.

## Getting Started

- [Overview](${RAW_BASE_PATH}/getting-started/index.mdx): Getting started overview
- [Installation](${RAW_BASE_PATH}/getting-started/installation.mdx): Install and setup Spoosh
- [First API Call](${RAW_BASE_PATH}/getting-started/first-api-call.mdx): Make your first API call

## Core

- [Overview](${RAW_BASE_PATH}/core/index.mdx): Core concepts overview
- [Client](${RAW_BASE_PATH}/core/client.mdx): Creating and configuring clients
- [Schema Definition](${RAW_BASE_PATH}/core/schema-definition.mdx): Define your API schema
- [Response](${RAW_BASE_PATH}/core/response.mdx): Response format and handling

${hooksOrInjectsSection}

## Type Adapters

- [Hono](${RAW_BASE_PATH}/type-adapters/hono.mdx): Hono server type adapter
- [Elysia](${RAW_BASE_PATH}/type-adapters/elysia.mdx): Elysia server type adapter
- [OpenAPI](${RAW_BASE_PATH}/type-adapters/openapi.mdx): Bidirectional OpenAPI conversion

## Plugins

- [Overview](${RAW_BASE_PATH}/plugins/index.mdx): Plugin system overview

### Data Fetching
- [Cache](${RAW_BASE_PATH}/plugins/cache.mdx): In-memory caching with stale-while-revalidate
- [Deduplication](${RAW_BASE_PATH}/plugins/deduplication.mdx): Prevent duplicate concurrent requests
- [Prefetch](${RAW_BASE_PATH}/plugins/prefetch.mdx): Preload data before navigation
- [Initial Data](${RAW_BASE_PATH}/plugins/initial-data.mdx): SSR hydration support
- [GC](${RAW_BASE_PATH}/plugins/gc.mdx): Garbage collection for cache management

### Mutations
- [Invalidation](${RAW_BASE_PATH}/plugins/invalidation.mdx): Auto-refresh queries after mutations
- [Optimistic](${RAW_BASE_PATH}/plugins/optimistic.mdx): Optimistic updates for instant UI feedback

### Resilience
- [Retry](${RAW_BASE_PATH}/plugins/retry.mdx): Automatic retry with exponential backoff
- [Throttle](${RAW_BASE_PATH}/plugins/throttle.mdx): Rate limiting for API calls
- [Debounce](${RAW_BASE_PATH}/plugins/debounce.mdx): Debounce rapid requests

### Real-time
- [Polling](${RAW_BASE_PATH}/plugins/polling.mdx): Periodic data refresh
- [Refetch](${RAW_BASE_PATH}/plugins/refetch.mdx): Refetch on window focus or reconnect

### Data Transformation
- [Transform](${RAW_BASE_PATH}/plugins/transform.mdx): Transform response data
- [QS](${RAW_BASE_PATH}/plugins/qs.mdx): Query string serialization for nested objects

### Framework Integration
- [Next.js](${RAW_BASE_PATH}/plugins/nextjs.mdx): Server-side cache revalidation

### Upload/Download
- [Progress](${RAW_BASE_PATH}/plugins/progress.mdx): Upload/download progress tracking via XHR

### Developer Tools
- [Debug](${RAW_BASE_PATH}/plugins/debug.mdx): Debug logging for development
- [Devtool](${RAW_BASE_PATH}/devtool/index.mdx): Visual debugging panel with plugin execution visualization

## Plugin Development

- [Overview](${RAW_BASE_PATH}/plugin-development/index.mdx): Building custom plugins
- [Middleware Patterns](${RAW_BASE_PATH}/plugin-development/advanced/patterns.mdx): Intercepting and transforming requests
- [After Response](${RAW_BASE_PATH}/plugin-development/advanced/after-response.mdx): Side effects that always run
- [Lifecycle Hooks](${RAW_BASE_PATH}/plugin-development/advanced/lifecycle.mdx): Component mount/unmount/update hooks
- [Meta Storage](${RAW_BASE_PATH}/plugin-development/advanced/meta-storage.mdx): Storing user-facing metadata
- [Plugin Communication](${RAW_BASE_PATH}/plugin-development/advanced/plugin-communication.mdx): Inter-plugin and intra-plugin communication
- [Instance API](${RAW_BASE_PATH}/plugin-development/advanced/instance-api.mdx): Adding methods to create() return
- [Type Safety](${RAW_BASE_PATH}/plugin-development/advanced/type-safety.mdx): Type-safe plugins and options
- [Architecture](${RAW_BASE_PATH}/plugin-development/advanced/architecture.mdx): Plugin system architecture
- [Testing](${RAW_BASE_PATH}/plugin-development/advanced/testing.mdx): Testing custom plugins

## Guides

- [Tags & Invalidation](${RAW_BASE_PATH}/guides/tags-and-invalidation.mdx): Tag modes, custom tags, invalidation strategies
- [Infinite Queries](${RAW_BASE_PATH}/guides/infinite-queries.mdx): Infinite queries with ${infiniteQueryHook}
- [Authentication](${RAW_BASE_PATH}/guides/authentication.mdx): Token management and auth flows
- [Error Handling](${RAW_BASE_PATH}/guides/error-handling.mdx): Global, per-request, and typed errors
- [Lazy Loading](${RAW_BASE_PATH}/guides/lazy-loading.mdx): Control when data fetches with enabled and trigger
`;
}

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ framework: string }> }
) {
  const { framework } = await params;
  const content = generateContent(
    framework === "angular" ? "angular" : "react"
  );

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
