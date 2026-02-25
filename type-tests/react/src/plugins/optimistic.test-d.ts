import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
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

// =============================================================================
// useRead - isOptimistic result field
// =============================================================================

const read = useRead((api) => api("posts").GET());
expectType<boolean>(read.meta.isOptimistic);

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });

// =============================================================================
// useWrite - optimistic callback in trigger
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
