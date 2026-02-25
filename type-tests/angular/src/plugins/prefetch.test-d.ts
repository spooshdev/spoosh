import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { prefetchPlugin } from "@spoosh/plugin-prefetch";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

prefetchPlugin({ staleTime: 5000 });
prefetchPlugin({ timeout: 60000 });
prefetchPlugin({ staleTime: 5000, timeout: 60000 });
prefetchPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - staleTime must be number
prefetchPlugin({ staleTime: "5000" });
// @ts-expect-error - timeout must be number
prefetchPlugin({ timeout: "60000" });
// @ts-expect-error - invalid option key
prefetchPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  prefetchPlugin(),
]);
const { prefetch } = create(spoosh);

// =============================================================================
// Instance API - prefetch
// =============================================================================

prefetch((api) => api("posts").GET());
prefetch((api) => api("posts/:id").GET({ params: { id: "1" } }));
prefetch((api) => api("activities").GET({ query: { limit: 10 } }));

// =============================================================================
// Note: prefetch plugin only provides instance API (prefetch function)
// It doesn't add options to hooks like injectRead, injectWrite, etc.
// =============================================================================
