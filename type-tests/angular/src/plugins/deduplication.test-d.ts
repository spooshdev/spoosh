import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectPages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - dedupe option (valid)
// =============================================================================

injectRead(postsReq, { dedupe: "in-flight" });
injectRead(postsReq, { dedupe: false });

// =============================================================================
// injectRead - dedupe option (invalid)
// =============================================================================

// @ts-expect-error - dedupe must be "in-flight" or false
injectRead(postsReq, { dedupe: "invalid" });
// @ts-expect-error - dedupe must be "in-flight" or false
injectRead(postsReq, { dedupe: true });

// =============================================================================
// injectWrite - dedupe option (valid)
// =============================================================================

injectWrite((api) => api("posts").POST(), { dedupe: "in-flight" });
injectWrite((api) => api("posts").POST(), { dedupe: false });

// =============================================================================
// injectWrite - dedupe option (invalid)
// =============================================================================

// @ts-expect-error - dedupe must be "in-flight" or false
injectWrite((api) => api("posts").POST(), { dedupe: "invalid" });
// @ts-expect-error - dedupe must be "in-flight" or false
injectWrite((api) => api("posts").POST(), { dedupe: true });

// =============================================================================
// injectPages - dedupe option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  dedupe: "in-flight",
  merger: () => [],
});

injectPages((api) => api("activities").GET({ query: {} }), {
  dedupe: false,
  merger: () => [],
});
