import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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
const { useRead, useWrite, usePages, useQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - qs option (valid)
// =============================================================================

useRead(postsReq, { qs: { arrayFormat: "brackets" } });
useRead(postsReq, { qs: { arrayFormat: "indices" } });
useRead(postsReq, { qs: { arrayFormat: "repeat" } });
useRead(postsReq, { qs: { arrayFormat: "comma" } });
useRead(postsReq, { qs: { skipNulls: true } });
useRead(postsReq, { qs: { skipNulls: false } });

// =============================================================================
// useRead - qs option (invalid)
// =============================================================================

// @ts-expect-error - invalid arrayFormat value
useRead(postsReq, { qs: { arrayFormat: "invalid" } });
// @ts-expect-error - skipNulls must be boolean
useRead(postsReq, { qs: { skipNulls: "true" } });

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
