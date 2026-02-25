import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { throttlePlugin } from "@spoosh/plugin-throttle";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

throttlePlugin();

// @ts-expect-error - throttlePlugin does not accept options
throttlePlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  throttlePlugin(),
]);
const { useRead } = create(spoosh);

// =============================================================================
// useRead - throttle option
// =============================================================================

useRead((api) => api("posts").GET(), { throttle: 1000 });
useRead((api) => api("posts").GET(), { throttle: 500 });

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });
