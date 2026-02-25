import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { qsPlugin } from "@spoosh/plugin-qs";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

qsPlugin({ arrayFormat: "brackets" });
qsPlugin({ arrayFormat: "indices" });
qsPlugin({ arrayFormat: "repeat" });
qsPlugin({ arrayFormat: "comma" });
qsPlugin({ skipNulls: true });
qsPlugin({ skipNulls: false });
qsPlugin({ arrayFormat: "brackets", skipNulls: true });
qsPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - invalid arrayFormat
qsPlugin({ arrayFormat: "invalid" });
// @ts-expect-error - skipNulls must be boolean
qsPlugin({ skipNulls: "true" });
// @ts-expect-error - invalid option key
qsPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([qsPlugin()]);
const { injectRead, injectPages } = create(spoosh);

// =============================================================================
// injectRead - qs option
// =============================================================================

injectRead((api) => api("posts").GET(), { qs: { arrayFormat: "brackets" } });
injectRead((api) => api("posts").GET(), { qs: { skipNulls: true } });
injectRead((api) => api("posts").GET(), {
  qs: { arrayFormat: "indices", skipNulls: false },
});

// =============================================================================
// injectPages - qs option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  qs: { arrayFormat: "brackets" },
  merger: () => [],
});

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
injectRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
injectRead((api) => api("posts").GET(), { dedupe: false });
