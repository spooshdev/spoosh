# @spoosh/plugin-transform

Transform response data with full type inference.

**[Documentation](https://spoosh.dev/docs/plugins/transform)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-transform
```

## Usage

### Response Transforms

Response transforms produce a separate `transformedData` field in `meta` while preserving the original `data`:

```typescript
import { Spoosh } from "@spoosh/core";
import { transformPlugin } from "@spoosh/plugin-transform";

const client = new Spoosh<ApiSchema, Error>("/api").use([transformPlugin()]);

const { data, meta } = useRead((api) => api("posts").GET(), {
  transform: (posts) => ({
    count: posts.length,
    hasMore: posts.length >= 10,
    ids: posts.map((p) => p.id),
  }),
});

// data = Post[] (original response, preserved)
// meta.transformedData = { count: number, hasMore: boolean, ids: number[] } | undefined
```

### Async Transforms

Transform functions support async operations:

```typescript
const { data, meta } = useRead((api) => api("posts").GET(), {
  transform: async (posts) => {
    const enriched = await enrichPostsWithMetadata(posts);
    return {
      count: enriched.length,
      titles: enriched.map((p) => p.title),
    };
  },
});
```

## Features

- ✅ Full type inference for transforms
- ✅ Async transform functions supported
- ✅ Per-request transforms (no global config needed)
- ✅ Return `undefined` to remove data entirely

## TypeScript Limitation (useWrite)

Due to TypeScript limitations with dynamic trigger options, `meta.transformedData` is typed as `never` in `useWrite` hook results. Use type assertion:

```typescript
type TransformedPost = {
  success: boolean;
  postId: number;
};

const { meta } = useWrite((api) => api("posts").POST);

// Type assertion required
const typed = meta.transformedData as TransformedPost | undefined;
```

This limitation does not affect `useRead` or `useInfiniteRead`, where options are passed at hook creation time.
