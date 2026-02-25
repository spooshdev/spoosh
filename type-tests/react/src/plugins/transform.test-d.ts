import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { transformPlugin } from "@spoosh/plugin-transform";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

transformPlugin();

// @ts-expect-error - transformPlugin does not accept options
transformPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  transformPlugin(),
]);
const { useRead, useWrite, useQueue } = create(spoosh);

// =============================================================================
// useRead - transform option and result
// =============================================================================

const read = useRead((api) => api("posts").GET(), {
  transform: (data) => data.map((p) => p.title),
});

if (read.meta.transformedData !== undefined) {
  expectType<string[]>(read.meta.transformedData);
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
// useWrite - transform option and result
// =============================================================================

const write = useWrite((api) => api("posts").POST(), {
  transform: (data) => ({ createdId: data.id }),
});

if (write.meta.transformedData !== undefined) {
  expectType<{ createdId: number }>(write.meta.transformedData);
}

// =============================================================================
// useQueue - transform option
// =============================================================================

useQueue((api) => api("uploads").POST(), {
  transform: (data) => ({ uploadedUrl: data.url }),
});
