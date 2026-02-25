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
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic update with single endpoint
const deleteWrite = useWrite((api) => api("posts/:id").DELETE());

deleteWrite.trigger({
  params: { id: "1" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => posts.filter((p) => p.id !== 1)),
});

// optimistic with ON_SUCCESS
write.trigger({
  body: { title: "test" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .ON_SUCCESS()
      .UPDATE_CACHE((posts, response) => {
        expectType<{ id: number; title: string }[]>(posts);
        expectType<{ id: number }>(response);
        return [...posts, { id: response.id, title: "test" }];
      }),
});

// optimistic with WHERE filter (requires endpoint with query/params)
write.trigger({
  body: { title: "test" },
  optimistic: (api) =>
    api("posts/:id")
      .GET()
      .WHERE((entry) => {
        expectType<Record<"id", string | number>>(entry.params);
        return entry.params.id === "1";
      })
      .UPDATE_CACHE((post) => ({ ...post, title: "updated" })),
});

// optimistic with NO_ROLLBACK
write.trigger({
  body: { title: "test" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .NO_ROLLBACK()
      .UPDATE_CACHE((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic with ON_ERROR
write.trigger({
  body: { title: "test" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .ON_ERROR((error) => {
        expectType<{ validation: string[] }>(error);
        console.error(error);
      })
      .UPDATE_CACHE((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic with multiple targets
write.trigger({
  body: { title: "test" },
  optimistic: (api) => [
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => [...posts, { id: 999, title: "test" }]),
    api("users")
      .GET()
      .UPDATE_CACHE((users) => [...users]),
  ],
});
