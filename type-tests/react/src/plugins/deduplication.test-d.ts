import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
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
const { useRead, useWrite, usePages } = create(spoosh);

// =============================================================================
// useRead - dedupe option
// =============================================================================

useRead((api) => api("posts").GET(), { dedupe: "in-flight" });
useRead((api) => api("posts").GET(), { dedupe: false });

// =============================================================================
// useWrite - dedupe option
// =============================================================================

useWrite((api) => api("posts").POST(), { dedupe: "in-flight" });
useWrite((api) => api("posts").POST(), { dedupe: false });

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

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - pollingInterval is from polling plugin, not installed
useRead((api) => api("posts").GET(), { pollingInterval: 5000 });
