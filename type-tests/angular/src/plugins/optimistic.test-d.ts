import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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

// =============================================================================
// injectRead - isOptimistic result field
// =============================================================================

const read = injectRead((api) => api("posts").GET());
expectType<boolean>(read.meta().isOptimistic);

// =============================================================================
// injectWrite - optimistic callback in trigger
// =============================================================================

const write = injectWrite((api) => api("posts").POST());
write.trigger({
  body: { title: "test" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => [...posts, { id: 999, title: "test" }]),
});

// optimistic update with single endpoint
const deleteWrite = injectWrite((api) => api("posts/:id").DELETE());
deleteWrite.trigger({
  params: { id: "1" },
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => posts.filter((p) => p.id !== 1)),
});
