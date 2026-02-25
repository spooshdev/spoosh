import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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

// @ts-expect-error - invalid read option
deduplicationPlugin({ read: "invalid-option" });
// @ts-expect-error - invalid write option
deduplicationPlugin({ write: "cancel" });
// @ts-expect-error - invalid option key
deduplicationPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  deduplicationPlugin(),
]);
const { injectRead, injectWrite, injectPages } = create(spoosh);

// =============================================================================
// injectRead - dedupe option
// =============================================================================

injectRead((api) => api("posts").GET(), { dedupe: "in-flight" });
injectRead((api) => api("posts").GET(), { dedupe: false });

// =============================================================================
// injectWrite - dedupe option
// =============================================================================

injectWrite((api) => api("posts").POST(), { dedupe: "in-flight" });
injectWrite((api) => api("posts").POST(), { dedupe: false });

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

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
injectRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - pollingInterval is from polling plugin, not installed
injectRead((api) => api("posts").GET(), { pollingInterval: 5000 });
