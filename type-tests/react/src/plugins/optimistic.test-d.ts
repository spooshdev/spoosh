import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
import { optimisticPlugin } from "@spoosh/plugin-optimistic";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

optimisticPlugin();

// @ts-expect-error - optimisticPlugin does not accept options
optimisticPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  optimisticPlugin(),
]);
const { useRead, useWrite } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - isOptimistic result field
// =============================================================================

const read = useRead(postsReq);
expectType<boolean>(read.meta.isOptimistic);

// =============================================================================
// useWrite - optimistic callback in trigger (valid)
// =============================================================================

const write = useWrite((api) => api("posts").POST());

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts").set((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic update with single endpoint
const deleteWrite = useWrite((api) => api("posts/:id").DELETE());

deleteWrite.trigger({
  params: { id: "1" },
  optimistic: (cache) =>
    cache("posts").set((posts) => posts.filter((p) => p.id !== 1)),
});

// optimistic with confirmed (on success)
write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .confirmed()
      .set((posts, response) => {
        expectType<{ id: number; title: string }[]>(posts);
        expectType<{ id: number }>(response);
        return [...posts, { id: response.id, title: "test" }];
      }),
});

// optimistic with filter (requires endpoint with query/params)
write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts/:id")
      .filter((entry) => {
        expectType<Record<"id", string>>(entry.params);
        return entry.params.id === "1";
      })
      .set((post) => ({ ...post, title: "updated" })),
});

// optimistic with disableRollback
write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .set((posts) => [...posts, { id: 999, title: "test" }])
      .disableRollback(),
});

// optimistic with onError
write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .set((posts) => [...posts, { id: 999, title: "test" }])
      .onError((error) => {
        expectType<{ validation: string[] }>(error);
        console.error(error);
      }),
});

// optimistic with multiple targets
write.trigger({
  body: { title: "test" },
  optimistic: (cache) => [
    cache("posts").set((posts) => [...posts, { id: 999, title: "test" }]),
    cache("users").set((users) => [...users]),
  ],
});

// optimistic with both immediate and confirmed
write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .set((posts) => [...posts, { id: 999, title: "pending..." }])
      .confirmed()
      .set((posts, response) => {
        expectType<{ id: number }>(response);
        return posts.map((p) =>
          p.id === 999 ? { ...p, id: response.id, title: "confirmed" } : p
        );
      }),
});

// =============================================================================
// Invalid flows (should be type errors)
// =============================================================================

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .set((posts) => posts)
      // @ts-expect-error - cannot call set() twice in immediate mode
      .set((posts) => posts),
});

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .confirmed()
      .set((posts) => posts)
      // @ts-expect-error - cannot call set() twice in confirmed mode
      .set((posts) => posts),
});

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .confirmed()
      // @ts-expect-error - cannot call confirmed() twice
      .confirmed()
      // @ts-expect-error - missing set() after confirmed()
      .set((posts) => posts),
});

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts/:id")
      .set((post) => post)
      // @ts-expect-error - cannot call filter() after set()
      .filter((e) => e.params.id === "1"),
});

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts/:id")
      .filter((e) => e.params.id === "1")
      // @ts-expect-error - cannot call filter() twice
      .filter((e) => e.params.id === "2"),
});

write.trigger({
  body: { title: "test" },
  // @ts-expect-error - disableRollback requires immediate set first
  optimistic: (cache) => cache("posts").disableRollback(),
});

write.trigger({
  body: { title: "test" },
  // @ts-expect-error - onError requires immediate set first
  optimistic: (cache) => cache("posts").onError(() => {}),
});

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts")
      .confirmed()
      .set((posts) => posts)
      // @ts-expect-error - disableRollback not available with confirmed-only
      .disableRollback(),
});

write.trigger({
  body: { title: "test" },
  // @ts-expect-error - invalid cache path
  optimistic: (cache) => cache("invalidPath").set((data) => data),
});

// =============================================================================
// Instance API - standalone optimistic (valid)
// =============================================================================

const { optimistic } = create(spoosh);

optimistic((cache) =>
  cache("posts").set((posts) => [...posts, { id: 999, title: "from ws" }])
);

optimistic((cache) =>
  cache("posts/:id")
    .filter((entry) => {
      expectType<Record<"id", string>>(entry.params);
      return entry.params.id === "1";
    })
    .set((post) => ({ ...post, title: "updated from ws" }))
);

optimistic((cache) => [
  cache("posts").set((posts) => [...posts, { id: 999, title: "new" }]),
  cache("users").set((users) => [...users]),
]);

// =============================================================================
// Instance API - standalone optimistic (invalid - no mutation lifecycle methods)
// =============================================================================

optimistic((cache) =>
  cache("posts")
    .set((posts) => posts)
    // @ts-expect-error - confirmed() not available in standalone mode
    .confirmed()
);

optimistic((cache) =>
  cache("posts")
    .set((posts) => posts)
    // @ts-expect-error - disableRollback() not available in standalone mode
    .disableRollback()
);

optimistic((cache) =>
  cache("posts")
    .set((posts) => posts)
    // @ts-expect-error - onError() not available in standalone mode
    .onError(() => {})
);

// @ts-expect-error - confirmed() not available even before set()
optimistic((cache) =>
  cache("posts")
    .confirmed()
    .set((posts) => posts)
);

// @ts-expect-error - invalid cache path
optimistic((cache) => cache("invalidPath").set((data) => data));
