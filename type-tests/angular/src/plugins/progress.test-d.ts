import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - progress option (valid)
// =============================================================================

injectRead(postsReq, { progress: true });
injectRead(postsReq, { progress: false });
injectRead(postsReq, { progress: { totalHeader: "X-Total" } });

// =============================================================================
// injectRead - progress option (invalid)
// =============================================================================

// @ts-expect-error - progress must be boolean or object
injectRead(postsReq, { progress: "true" });
// @ts-expect-error - totalHeader must be string
injectRead(postsReq, { progress: { totalHeader: 123 } });

// =============================================================================
// injectRead - progress result field
// =============================================================================

const read = injectRead(postsReq, { progress: true });
const readProgress = read.meta().progress;
if (readProgress) {
  expectType<number>(readProgress.loaded);
  expectType<number>(readProgress.total);
}

// =============================================================================
// injectWrite - progress option (valid)
// =============================================================================

injectWrite((api) => api("posts").POST(), { progress: true });
injectWrite((api) => api("posts").POST(), { progress: false });
injectWrite((api) => api("posts").POST(), {
  progress: { totalHeader: "X-Total" },
});

// =============================================================================
// injectWrite - progress option (invalid)
// =============================================================================

// @ts-expect-error - progress must be boolean or object
injectWrite((api) => api("posts").POST(), { progress: "true" });

// =============================================================================
// injectWrite - progress result field
// =============================================================================

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

injectPages((api) => api("activities").GET({ query: {} }), {
  progress: { totalHeader: "X-Total" },
  merger: () => [],
});

// =============================================================================
// injectQueue - progress option
// =============================================================================

injectQueue((api) => api("uploads").POST(), { progress: true });
injectQueue((api) => api("uploads").POST(), {
  progress: { totalHeader: "X-Total" },
});
