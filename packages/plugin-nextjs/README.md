# @spoosh/plugin-nextjs

Next.js integration plugin for Spoosh - server-side cache revalidation after mutations.

**[Documentation](https://spoosh.dev/docs/plugins/nextjs)** · **Requirements:** TypeScript >= 5.0, Next.js supporting server actions · **Peer Dependencies:** `@spoosh/core`, `@spoosh/plugin-invalidation`

## Installation

```bash
npm install @spoosh/plugin-nextjs
```

## Usage

### Create server action

```typescript
"use server";

import { revalidateTag, revalidatePath } from "next/cache";

export async function revalidateAction(tags: string[], paths: string[]) {
  tags.forEach((tag) => revalidateTag(tag));
  paths.forEach((path) => revalidatePath(path));
}
```

```typescript
import { nextjsPlugin } from "@spoosh/plugin-nextjs";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";

const plugins = [
  invalidationPlugin(),
  nextjsPlugin({ serverRevalidator: revalidateAction }),
] as const;

// After a successful mutation, cache tags are automatically revalidated
const { trigger } = useWrite((api) => api.posts.$post);

await trigger({ body: { title: "New Post" } });
// Revalidates: ["posts"] tag on the server
```

### Revalidate Additional Paths

```typescript
const { trigger } = useWrite((api) => api.posts.$post);

await trigger({
  body: { title: "New Post" },
  revalidatePaths: ["/", "/posts"],
});
```

### Skip Revalidation

```typescript
// Skip for a specific mutation
await trigger({
  body: { title: "Draft" },
  serverRevalidate: false,
});
```

## When to Use `skipServerRevalidation`

### Client-Heavy Apps (CSR/SPA)

For apps that primarily fetch data on the client side, set `skipServerRevalidation: true` by default and opt-in for specific mutations that affect server-rendered content:

```typescript
const plugins = [
  nextjsPlugin({
    serverRevalidator: revalidate,
    skipServerRevalidation: true, // Skip by default
  }),
] as const;

// Most mutations don't need server revalidation
await trigger({ body: data });

// Opt-in when mutation affects server-rendered pages
await trigger({
  body: data,
  serverRevalidate: true, // Explicitly enable
});
```

### Server-Heavy Apps (SSR/RSC)

For apps that rely heavily on server-side rendering or React Server Components, keep the default behavior (revalidate on every mutation) and opt-out when needed:

```typescript
const plugins = [
  nextjsPlugin({
    serverRevalidator: revalidate,
    // skipServerRevalidation: false (default)
  }),
] as const;

// Server cache is revalidated by default
await trigger({ body: data });

// Skip for mutations that don't affect server content
await trigger({
  body: { theme: "dark" },
  serverRevalidate: false, // Skip for client-only state
});
```

## Options

### Plugin Config

| Option                   | Type                               | Default | Description                       |
| ------------------------ | ---------------------------------- | ------- | --------------------------------- |
| `serverRevalidator`      | `(tags, paths) => void \| Promise` | -       | Server action to revalidate cache |
| `skipServerRevalidation` | `boolean`                          | `false` | Skip revalidation by default      |

### Per-Request Options

| Option             | Type       | Description                                     |
| ------------------ | ---------- | ----------------------------------------------- |
| `revalidatePaths`  | `string[]` | Additional paths to revalidate                  |
| `serverRevalidate` | `boolean`  | Override whether to trigger server revalidation |
