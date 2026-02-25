import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { debouncePlugin } from "@spoosh/plugin-debounce";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

debouncePlugin();

// @ts-expect-error - debouncePlugin does not accept options
debouncePlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  debouncePlugin(),
]);
const { useRead } = create(spoosh);

// =============================================================================
// useRead - debounce option
// =============================================================================

useRead((api) => api("posts").GET(), { debounce: 300 });
useRead((api) => api("posts").GET(), { debounce: () => 500 });

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });
