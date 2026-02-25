import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectPages } = create(spoosh);

// =============================================================================
// injectRead - staleTime option
// =============================================================================

injectRead((api) => api("posts").GET(), { staleTime: 5000 });
injectRead((api) => api("posts").GET(), { staleTime: 0 });
injectRead((api) => api("posts").GET(), { staleTime: Infinity });

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - retry is from retry plugin, not installed
injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
injectRead((api) => api("posts").GET(), { dedupe: false });
// @ts-expect-error - pollingInterval is from polling plugin, not installed
injectRead((api) => api("posts").GET(), { pollingInterval: 5000 });

// =============================================================================
// injectWrite - clearCache trigger option
// =============================================================================

const write = injectWrite((api) => api("posts").POST());
write.trigger({ body: { title: "test" }, clearCache: true });
write.trigger({ body: { title: "test" }, clearCache: false });

// =============================================================================
// injectPages - staleTime option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  staleTime: 5000,
  merger: () => [],
});
