import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { progressPlugin } from "@spoosh/plugin-progress";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

progressPlugin();

// @ts-expect-error - progressPlugin does not accept options
progressPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  progressPlugin(),
]);
const { useRead, useWrite, usePages, useQueue } = create(spoosh);

// =============================================================================
// useRead - progress option and result
// =============================================================================

useRead((api) => api("posts").GET(), { progress: true });
useRead((api) => api("posts").GET(), { progress: { totalHeader: "X-Total" } });

const read = useRead((api) => api("posts").GET(), { progress: true });
if (read.meta.progress) {
  expectType<number>(read.meta.progress.loaded);
  expectType<number>(read.meta.progress.total);
}

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
// useWrite - progress option and result
// =============================================================================

useWrite((api) => api("posts").POST(), { progress: true });
useWrite((api) => api("posts").POST(), {
  progress: { totalHeader: "X-Total" },
});

const write = useWrite((api) => api("posts").POST(), { progress: true });
if (write.meta.progress) {
  expectType<number>(write.meta.progress.loaded);
  expectType<number>(write.meta.progress.total);
}

// =============================================================================
// usePages - progress option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  progress: true,
  merger: () => [],
});

// =============================================================================
// useQueue - progress option
// =============================================================================

useQueue((api) => api("uploads").POST(), { progress: true });
useQueue((api) => api("uploads").POST(), {
  progress: { totalHeader: "X-Total" },
});
