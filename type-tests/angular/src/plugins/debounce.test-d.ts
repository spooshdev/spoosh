import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { debouncePlugin } from "@spoosh/plugin-debounce";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

debouncePlugin();

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  debouncePlugin(),
]);
const { injectRead } = create(spoosh);

// =============================================================================
// injectRead - debounce option
// =============================================================================

injectRead((api) => api("posts").GET(), { debounce: 300 });
injectRead((api) => api("posts").GET(), { debounce: 500 });

// =============================================================================
// injectRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
injectRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
injectRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
injectRead((api) => api("posts").GET(), { dedupe: false });
