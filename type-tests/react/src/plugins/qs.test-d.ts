import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { qsPlugin } from "@spoosh/plugin-qs";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

qsPlugin({ arrayFormat: "brackets" });
qsPlugin({ arrayFormat: "indices" });
qsPlugin({ arrayFormat: "repeat" });
qsPlugin({ skipNulls: true });
qsPlugin({ arrayFormat: "brackets", skipNulls: true });
qsPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - invalid arrayFormat value
qsPlugin({ arrayFormat: "invalid" });
// @ts-expect-error - skipNulls must be boolean
qsPlugin({ skipNulls: "true" });
// @ts-expect-error - invalid option key
qsPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([qsPlugin()]);
const { useRead, useWrite, usePages, useQueue } = create(spoosh);

// =============================================================================
// useRead - qs option
// =============================================================================

useRead((api) => api("posts").GET(), { qs: { arrayFormat: "brackets" } });
useRead((api) => api("posts").GET(), { qs: { arrayFormat: "indices" } });
useRead((api) => api("posts").GET(), { qs: { arrayFormat: "repeat" } });
useRead((api) => api("posts").GET(), { qs: { skipNulls: true } });

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
// useWrite - qs option
// =============================================================================

useWrite((api) => api("posts").POST(), { qs: { arrayFormat: "brackets" } });
useWrite((api) => api("posts").POST(), { qs: { skipNulls: true } });

// =============================================================================
// usePages - qs option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  qs: { arrayFormat: "brackets" },
  merger: () => [],
});

// =============================================================================
// useQueue - qs option
// =============================================================================

useQueue((api) => api("uploads").POST(), { qs: { arrayFormat: "brackets" } });
useQueue((api) => api("uploads").POST(), { qs: { skipNulls: true } });
