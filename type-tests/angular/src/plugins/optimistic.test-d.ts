import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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
const { injectRead, injectWrite } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - isOptimistic result field
// =============================================================================

const read = injectRead(postsReq);
expectType<boolean>(read.meta().isOptimistic);

// =============================================================================
// injectWrite - optimistic callback in trigger (valid)
// =============================================================================

const write = injectWrite((api) => api("posts").POST());

write.trigger({
  body: { title: "test" },
  optimistic: (cache) =>
    cache("posts").set((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic update with single endpoint
const deleteWrite = injectWrite((api) => api("posts/:id").DELETE());

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
        expectType<Record<"id", string | number>>(entry.params);
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
        const postId = (response as { id: number }).id;
        return posts.map((p) =>
          p.id === 999 ? { ...p, id: postId, title: "confirmed" } : p
        );
      }),
});
