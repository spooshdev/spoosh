import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectPages, injectQueue } = create(spoosh);

// =============================================================================
// injectRead - progress option and result
// =============================================================================

injectRead((api) => api("posts").GET(), { progress: true });
injectRead((api) => api("posts").GET(), {
  progress: { totalHeader: "X-Total" },
});

const read = injectRead((api) => api("posts").GET(), { progress: true });
const readProgress = read.meta().progress;
if (readProgress) {
  expectType<number>(readProgress.loaded);
  expectType<number>(readProgress.total);
}

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
injectRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
injectRead((api) => api("posts").GET(), { dedupe: false });

// =============================================================================
// injectWrite - progress option and result
// =============================================================================

injectWrite((api) => api("posts").POST(), { progress: true });
injectWrite((api) => api("posts").POST(), {
  progress: { totalHeader: "X-Total" },
});

const write = injectWrite((api) => api("posts").POST(), { progress: true });
const writeProgress = write.meta().progress;
if (writeProgress) {
  expectType<number>(writeProgress.loaded);
  expectType<number>(writeProgress.total);
}

// =============================================================================
// injectPages - progress option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  progress: true,
  merger: () => [],
});

// =============================================================================
// injectQueue - progress option
// =============================================================================

injectQueue((api) => api("uploads").POST(), { progress: true });
injectQueue((api) => api("uploads").POST(), {
  progress: { totalHeader: "X-Total" },
});
