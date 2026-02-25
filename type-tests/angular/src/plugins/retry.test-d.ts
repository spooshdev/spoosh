import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { retryPlugin } from "@spoosh/plugin-retry";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

retryPlugin({ retries: 5 });
retryPlugin({ retries: 3, retryDelay: 2000 });
retryPlugin({ retries: false });
retryPlugin({ shouldRetry: (ctx) => ctx.attempt < 3 });
retryPlugin({
  retries: 3,
  retryDelay: 1000,
  shouldRetry: (ctx) => ctx.status !== 404,
});
retryPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - retries must be number or false
retryPlugin({ retries: "3" });
// @ts-expect-error - retryDelay must be number
retryPlugin({ retryDelay: "1000" });
// @ts-expect-error - invalid option key
retryPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  retryPlugin(),
]);
const { injectRead, injectWrite, injectPages, injectQueue } = create(spoosh);

// =============================================================================
// injectRead - retry option
// =============================================================================

injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
injectRead((api) => api("posts").GET(), { retry: { retries: 3, delay: 1000 } });
injectRead((api) => api("posts").GET(), {
  retry: { retries: 3, delay: 1000, shouldRetry: (error) => error !== null },
});
injectRead((api) => api("posts").GET(), { retry: { retries: false } });

// =============================================================================
// injectWrite - retry option
// =============================================================================

injectWrite((api) => api("posts").POST(), { retry: { retries: 2 } });
injectWrite((api) => api("posts").POST(), { retry: { retries: false } });

// =============================================================================
// injectPages - retry option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  retry: { retries: 2 },
  merger: () => [],
});

// =============================================================================
// injectQueue - retry option
// =============================================================================

injectQueue((api) => api("uploads").POST(), { retry: { retries: 3 } });
injectQueue((api) => api("uploads").POST(), { retry: { retries: false } });

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
injectRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
injectRead((api) => api("posts").GET(), { dedupe: false });
// @ts-expect-error - pollingInterval is from polling plugin, not installed
injectRead((api) => api("posts").GET(), { pollingInterval: 5000 });
