# @spoosh/react

React hooks for Spoosh - `useRead`, `useWrite`, and `useInfiniteRead`.

**[Documentation](https://spoosh.dev/docs/integrations/react)** · **Requirements:** TypeScript >= 5.0, React >= 18.0

## Installation

```bash
npm install @spoosh/core @spoosh/react
```

## Usage

### Setup

```typescript
import { createSpoosh } from "@spoosh/core";
import { createReactSpoosh } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";

const plugins = [cachePlugin({ staleTime: 5000 })] as const;

const client = createSpoosh<ApiSchema, Error, typeof plugins>({
  baseUrl: "/api",
  plugins,
});

export const { useRead, useWrite, useInfiniteRead } = createReactSpoosh(client);
```

### useRead

Fetch data with automatic caching and refetching.

```typescript
function UserList() {
  const { data, loading, error, refetch } = useRead(
    (api) => api.users.$get()
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((user) => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}

// With options
const { data } = useRead(
  (api) => api.users.$get({ query: { page: 1 } }),
  {
    staleTime: 10000,
    enabled: isReady,
  }
);
```

### useWrite

Trigger mutations with loading and error states.

```typescript
function CreateUser() {
  const { trigger, loading, error } = useWrite(
    (api) => api.users.$post
  );

  const handleSubmit = async (data: CreateUserBody) => {
    const result = await trigger({ body: data });
    if (result.data) {
      // Success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}
```

### useInfiniteRead

Bidirectional paginated data fetching with infinite scroll support.

```typescript
function PostList() {
  const {
    data,
    allResponses,
    loading,
    canFetchNext,
    canFetchPrev,
    fetchNext,
    fetchPrev,
    fetchingNext,
    fetchingPrev,
  } = useInfiniteRead(
    (api) => api.posts.$get({ query: { page: 1 } }),
    {
      // Required: Check if next page exists
      canFetchNext: ({ response }) => response?.meta.hasMore ?? false,

      // Required: Build request for next page
      nextPageRequest: ({ response, request }) => ({
        query: { ...request.query, page: (response?.meta.page ?? 0) + 1 },
      }),

      // Required: Merge all responses into items
      merger: (allResponses) => allResponses.flatMap((r) => r.items),

      // Optional: Check if previous page exists
      canFetchPrev: ({ response }) => (response?.meta.page ?? 1) > 1,

      // Optional: Build request for previous page
      prevPageRequest: ({ response, request }) => ({
        query: { ...request.query, page: (response?.meta.page ?? 2) - 1 },
      }),
    }
  );

  return (
    <div>
      {canFetchPrev && (
        <button onClick={fetchPrev} disabled={fetchingPrev}>
          {fetchingPrev ? "Loading..." : "Load Previous"}
        </button>
      )}

      {data?.map((post) => <PostCard key={post.id} post={post} />)}

      {canFetchNext && (
        <button onClick={fetchNext} disabled={fetchingNext}>
          {fetchingNext ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

## API Reference

### useRead(readFn, options?)

| Option           | Type      | Default | Description                          |
| ---------------- | --------- | ------- | ------------------------------------ |
| `enabled`        | `boolean` | `true`  | Whether to fetch automatically       |
| `staleTime`      | `number`  | -       | Cache stale time (from plugin-cache) |
| `retries`        | `number`  | -       | Retry attempts (from plugin-retry)   |
| + plugin options | -         | -       | Options from installed plugins       |

**Returns:**

| Property   | Type                  | Description              |
| ---------- | --------------------- | ------------------------ |
| `data`     | `TData \| undefined`  | Response data            |
| `error`    | `TError \| undefined` | Error if request failed  |
| `loading`  | `boolean`             | True during initial load |
| `fetching` | `boolean`             | True during any fetch    |
| `refetch`  | `() => Promise`       | Manually trigger refetch |
| `abort`    | `() => void`          | Abort current request    |

### useWrite(writeFn)

**Returns:**

| Property  | Type                   | Description                        |
| --------- | ---------------------- | ---------------------------------- |
| `trigger` | `(options) => Promise` | Execute the mutation               |
| `data`    | `TData \| undefined`   | Response data                      |
| `error`   | `TError \| undefined`  | Error if request failed            |
| `loading` | `boolean`              | True while mutation is in progress |
| `reset`   | `() => void`           | Reset state                        |
| `abort`   | `() => void`           | Abort current request              |

### useInfiniteRead(readFn, options)

| Option            | Type                         | Required | Description                     |
| ----------------- | ---------------------------- | -------- | ------------------------------- |
| `canFetchNext`    | `(ctx) => boolean`           | Yes      | Check if next page exists       |
| `nextPageRequest` | `(ctx) => Partial<TRequest>` | Yes      | Build request for next page     |
| `merger`          | `(allResponses) => TItem[]`  | Yes      | Merge all responses into items  |
| `canFetchPrev`    | `(ctx) => boolean`           | No       | Check if previous page exists   |
| `prevPageRequest` | `(ctx) => Partial<TRequest>` | No       | Build request for previous page |
| `enabled`         | `boolean`                    | No       | Whether to fetch automatically  |

**Context object passed to callbacks:**

```typescript
type Context<TData, TRequest> = {
  response: TData | undefined; // Latest response
  allResponses: TData[]; // All fetched responses
  request: TRequest; // Current request options
};
```

**Returns:**

| Property       | Type                   | Description                     |
| -------------- | ---------------------- | ------------------------------- |
| `data`         | `TItem[] \| undefined` | Merged items from all responses |
| `allResponses` | `TData[] \| undefined` | Array of all raw responses      |
| `loading`      | `boolean`              | True during initial load        |
| `fetching`     | `boolean`              | True during any fetch           |
| `fetchingNext` | `boolean`              | True while fetching next page   |
| `fetchingPrev` | `boolean`              | True while fetching previous    |
| `canFetchNext` | `boolean`              | Whether next page exists        |
| `canFetchPrev` | `boolean`              | Whether previous page exists    |
| `fetchNext`    | `() => Promise<void>`  | Fetch the next page             |
| `fetchPrev`    | `() => Promise<void>`  | Fetch the previous page         |
| `refetch`      | `() => Promise<void>`  | Refetch all pages               |
| `abort`        | `() => void`           | Abort current request           |
| `error`        | `TError \| undefined`  | Error if request failed         |
