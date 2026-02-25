import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { retryPlugin } from "@spoosh/plugin-retry";
import { optimisticPlugin } from "@spoosh/plugin-optimistic";
import { pollingPlugin } from "@spoosh/plugin-polling";
import { refetchPlugin } from "@spoosh/plugin-refetch";
import { debouncePlugin } from "@spoosh/plugin-debounce";
import { throttlePlugin } from "@spoosh/plugin-throttle";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";
import { initialDataPlugin } from "@spoosh/plugin-initial-data";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";
import { progressPlugin } from "@spoosh/plugin-progress";
import { qsPlugin } from "@spoosh/plugin-qs";
import { transformPlugin } from "@spoosh/plugin-transform";
import { prefetchPlugin } from "@spoosh/plugin-prefetch";
import { gcPlugin } from "@spoosh/plugin-gc";
import type { TestSchema, DefaultError } from "./schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
  retryPlugin(),
  optimisticPlugin(),
  pollingPlugin(),
  refetchPlugin(),
  debouncePlugin(),
  throttlePlugin(),
  deduplicationPlugin(),
  initialDataPlugin(),
  invalidationPlugin(),
  progressPlugin(),
  qsPlugin(),
  transformPlugin(),
  prefetchPlugin(),
  gcPlugin(),
]);

const { useRead, useWrite, invalidate, prefetch, runGc } = create(spoosh);

// All options available together on useRead
const read = useRead((api) => api("posts").GET(), {
  staleTime: 5000,
  retry: { retries: 3 },
  pollingInterval: 10000,
  refetch: { onFocus: true },
  debounce: 300,
  throttle: 1000,
  dedupe: "in-flight",
  initialData: [{ id: 1, title: "Initial" }],
  progress: true,
  qs: { arrayFormat: "brackets" },
  transform: (data) => data,
});

// All result fields available
expectType<boolean>(read.meta.isOptimistic);
expectType<boolean>(read.meta.isInitialData);
if (read.meta.progress) {
  expectType<number>(read.meta.progress.loaded);
}

// All trigger options available on useWrite
const write = useWrite((api) => api("posts").POST());
write.trigger({
  body: { title: "test" },
  clearCache: true,
  invalidate: ["posts"],
  optimistic: (api) =>
    api("posts")
      .GET()
      .UPDATE_CACHE((posts) => posts),
});

// All instance APIs available
invalidate(["posts"]);
prefetch((api) => api("posts").GET());
const removed = runGc();
expectType<number>(removed);
