# @spoosh/plugin-transform

Transform response data with full type inference.

**[Documentation](https://spoosh.dev/docs/react/plugins/transform)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

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

const spoosh = new Spoosh<ApiSchema, Error>("/api").use([transformPlugin()]);

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

## useWrite with Transform

With the hook-level options pattern, `transform` is now passed as a second argument to `useWrite`, enabling full type inference:

```typescript
type TransformedPost = {
  success: boolean;
  postId: number;
};

const { trigger, meta } = useWrite((api) => api("posts").POST(), {
  transform: (post) => ({
    success: true,
    postId: post.id,
  }),
});

await trigger({ body: { title: "New Post" } });

// meta.transformedData is now properly typed!
const typed = meta.transformedData; // Type: TransformedPost | undefined
```
