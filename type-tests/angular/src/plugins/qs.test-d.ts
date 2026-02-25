import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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

// @ts-expect-error - invalid arrayFormat value
qsPlugin({ arrayFormat: "invalid" });
// @ts-expect-error - skipNulls must be boolean
qsPlugin({ skipNulls: "true" });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([qsPlugin()]);
const { injectRead, injectWrite, injectPages, injectQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - qs option (valid)
// =============================================================================

injectRead(postsReq, { qs: { arrayFormat: "brackets" } });
injectRead(postsReq, { qs: { arrayFormat: "indices" } });
injectRead(postsReq, { qs: { arrayFormat: "repeat" } });
injectRead(postsReq, { qs: { arrayFormat: "comma" } });
injectRead(postsReq, { qs: { skipNulls: true } });
injectRead(postsReq, { qs: { skipNulls: false } });

// =============================================================================
// injectRead - qs option (invalid)
// =============================================================================

// @ts-expect-error - invalid arrayFormat value
injectRead(postsReq, { qs: { arrayFormat: "invalid" } });
// @ts-expect-error - skipNulls must be boolean
injectRead(postsReq, { qs: { skipNulls: "true" } });

// =============================================================================
// injectWrite - qs option
// =============================================================================

injectWrite((api) => api("posts").POST(), { qs: { arrayFormat: "brackets" } });
injectWrite((api) => api("posts").POST(), { qs: { skipNulls: true } });

// =============================================================================
// injectPages - qs option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  qs: { arrayFormat: "brackets" },
  merger: () => [],
});

// =============================================================================
// injectQueue - qs option
// =============================================================================

injectQueue((api) => api("uploads").POST(), {
  qs: { arrayFormat: "brackets" },
});
injectQueue((api) => api("uploads").POST(), { qs: { skipNulls: true } });
