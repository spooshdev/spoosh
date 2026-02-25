import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectQueue } = create(spoosh);

// =============================================================================
// injectRead - transform option and result
// =============================================================================

const read = injectRead((api) => api("posts").GET(), {
  transform: (data) => data.map((p) => p.title),
});

const transformedReadData = read.meta().transformedData;
if (transformedReadData !== undefined) {
  expectType<string[]>(transformedReadData);
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
// injectWrite - transform option and result
// =============================================================================

const write = injectWrite((api) => api("posts").POST(), {
  transform: (data) => ({ createdId: data.id }),
});

const transformedWriteData = write.meta().transformedData;
if (transformedWriteData !== undefined) {
  expectType<{ createdId: number }>(transformedWriteData);
}

// =============================================================================
// injectQueue - transform option
// =============================================================================

injectQueue((api) => api("uploads").POST(), {
  transform: (data) => ({ uploadedUrl: data.url }),
});
