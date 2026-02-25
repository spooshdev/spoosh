import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

cachePlugin({ staleTime: 5000 });
cachePlugin({ staleTime: 0 });
cachePlugin({ staleTime: Infinity });
cachePlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - staleTime must be number
cachePlugin({ staleTime: "5000" });
// @ts-expect-error - invalid option key
cachePlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { useRead, useWrite, usePages } = create(spoosh);

// =============================================================================
// useRead - staleTime option
// =============================================================================

useRead((api) => api("posts").GET(), { staleTime: 5000 });
useRead((api) => api("posts").GET(), { staleTime: 0 });
useRead((api) => api("posts").GET(), { staleTime: Infinity });

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });
// @ts-expect-error - pollingInterval is from polling plugin, not installed
useRead((api) => api("posts").GET(), { pollingInterval: 5000 });

// =============================================================================
// useWrite - clearCache trigger option
// =============================================================================

const write = useWrite((api) => api("posts").POST());
write.trigger({ body: { title: "test" }, clearCache: true });
write.trigger({ body: { title: "test" }, clearCache: false });

// =============================================================================
// usePages - staleTime option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  staleTime: 5000,
  merger: () => [],
});
