import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - progress option (valid)
// =============================================================================

useRead(postsReq, { progress: true });
useRead(postsReq, { progress: false });
useRead(postsReq, { progress: { totalHeader: "X-Total" } });

// =============================================================================
// useRead - progress option (invalid)
// =============================================================================

// @ts-expect-error - progress must be boolean or object
useRead(postsReq, { progress: "true" });
// @ts-expect-error - totalHeader must be string
useRead(postsReq, { progress: { totalHeader: 123 } });

// =============================================================================
// useRead - progress result field
// =============================================================================

const read = useRead(postsReq, { progress: true });
if (read.meta.progress) {
  expectType<number>(read.meta.progress.loaded);
  expectType<number>(read.meta.progress.total);
}

// =============================================================================
// useWrite - progress option (valid)
// =============================================================================

useWrite((api) => api("posts").POST(), { progress: true });
useWrite((api) => api("posts").POST(), { progress: false });
useWrite((api) => api("posts").POST(), {
  progress: { totalHeader: "X-Total" },
});

// =============================================================================
// useWrite - progress option (invalid)
// =============================================================================

// @ts-expect-error - progress must be boolean or object
useWrite((api) => api("posts").POST(), { progress: "true" });

// =============================================================================
// useWrite - progress result field
// =============================================================================

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

usePages((api) => api("activities").GET({ query: {} }), {
  progress: { totalHeader: "X-Total" },
  merger: () => [],
});

// =============================================================================
// useQueue - progress option
// =============================================================================

useQueue((api) => api("uploads").POST(), { progress: true });
useQueue((api) => api("uploads").POST(), {
  progress: { totalHeader: "X-Total" },
});
