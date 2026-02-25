import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

deduplicationPlugin({ read: "in-flight" });
deduplicationPlugin({ write: "in-flight" });
deduplicationPlugin({ read: "in-flight", write: "in-flight" });
deduplicationPlugin({ read: false, write: false });
deduplicationPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - read must be "in-flight" or false
deduplicationPlugin({ read: "invalid-option" });
// @ts-expect-error - write must be "in-flight" or false
deduplicationPlugin({ write: "cancel" });
// @ts-expect-error - read must be "in-flight" or false
deduplicationPlugin({ read: true });
// @ts-expect-error - invalid option key
deduplicationPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  deduplicationPlugin(),
]);
const { useRead, useWrite, usePages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - dedupe option (valid)
// =============================================================================

useRead(postsReq, { dedupe: "in-flight" });
useRead(postsReq, { dedupe: false });

// =============================================================================
// useRead - dedupe option (invalid)
// =============================================================================

// @ts-expect-error - dedupe must be "in-flight" or false
useRead(postsReq, { dedupe: "invalid" });
// @ts-expect-error - dedupe must be "in-flight" or false
useRead(postsReq, { dedupe: true });

// =============================================================================
// useWrite - dedupe option (valid)
// =============================================================================

useWrite((api) => api("posts").POST(), { dedupe: "in-flight" });
useWrite((api) => api("posts").POST(), { dedupe: false });

// =============================================================================
// useWrite - dedupe option (invalid)
// =============================================================================

// @ts-expect-error - dedupe must be "in-flight" or false
useWrite((api) => api("posts").POST(), { dedupe: "invalid" });
// @ts-expect-error - dedupe must be "in-flight" or false
useWrite((api) => api("posts").POST(), { dedupe: true });

// =============================================================================
// usePages - dedupe option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  dedupe: "in-flight",
  merger: () => [],
});

usePages((api) => api("activities").GET({ query: {} }), {
  dedupe: false,
  merger: () => [],
});
