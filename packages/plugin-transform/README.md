# @spoosh/plugin-transform

Transform request and response data with full type inference.

**[Documentation](https://spoosh.dev/docs/plugins/transform)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## Installation

```bash
npm install @spoosh/plugin-transform
```

## Usage

### Request Transforms

```typescript
import { Spoosh } from "@spoosh/core";
import { transformPlugin } from "@spoosh/plugin-transform";

const client = new Spoosh<ApiSchema, Error>("/api").use([transformPlugin()]);

const { data } = useRead((api) => api.posts.$get({ query: { page: 1 } }), {
  transform: {
    query: (q) => ({ ...q, limit: 10 }),
  },
});

// Transform body in useWrite
const { trigger } = useWrite((api) => api.posts.$post);

trigger({
  body: { title: "New Post" },
  transform: {
    body: (b) => ({ ...b, createdAt: Date.now() }),
  },
});
```

### Response Transforms

Response transforms produce a separate `transformedData` field while preserving the original `data`:

```typescript
const { data, transformedData } = useRead((api) => api.posts.$get(), {
  transform: {
    response: (posts) => ({
      count: posts.length,
      hasMore: posts.length >= 10,
      ids: posts.map((p) => p.id),
    }),
  },
});

// data = Post[] (original response, preserved)
// transformedData = { count: number, hasMore: boolean, ids: number[] } | undefined
```

## Transform Types

The plugin supports transformation of:

- **query** - Transform query parameters before request
- **body** - Transform JSON body before request
- **formData** - Transform form data before request
- **urlEncoded** - Transform URL-encoded data before request
- **response** - Transform response data after request (produces `transformedData`)

## Features

- ✅ Full type inference for all transforms
- ✅ Async transform functions supported
- ✅ Automatic deep cloning (safe to mutate)
- ✅ Per-request transforms (no global config needed)
- ✅ Return `undefined` to remove data entirely

## TypeScript Limitation (useWrite)

Due to TypeScript limitations with dynamic trigger options, `transformedData` is typed as `never` in `useWrite` hook results. Use type assertion:

```typescript
type TransformedPost = {
  success: boolean;
  postId: number;
};

const { transformedData } = useWrite((api) => api.posts.$post);

// Type assertion required
const typed = transformedData as TransformedPost | undefined;
```

This limitation does not affect `useRead` or `useInfiniteRead`, where options are passed at hook creation time.
