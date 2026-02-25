import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { pollingPlugin } from "@spoosh/plugin-polling";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

pollingPlugin();

// @ts-expect-error - pollingPlugin does not accept options
pollingPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  pollingPlugin(),
]);
const { useRead } = create(spoosh);

// =============================================================================
// useRead - pollingInterval option
// =============================================================================

useRead((api) => api("posts").GET(), { pollingInterval: 5000 });
useRead((api) => api("posts").GET(), { pollingInterval: false });
useRead((api) => api("posts").GET(), {
  pollingInterval: ({ error }) => (error ? false : 5000),
});

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });
