import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { refetchPlugin } from "@spoosh/plugin-refetch";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

refetchPlugin({ refetchOnFocus: true });
refetchPlugin({ refetchOnReconnect: true });
refetchPlugin({ refetchOnFocus: true, refetchOnReconnect: true });
refetchPlugin({ refetchOnFocus: false, refetchOnReconnect: false });
refetchPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - refetchOnFocus must be boolean
refetchPlugin({ refetchOnFocus: "true" });
// @ts-expect-error - invalid option key
refetchPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  refetchPlugin(),
]);
const { useRead } = create(spoosh);

// =============================================================================
// useRead - refetch option
// =============================================================================

useRead((api) => api("posts").GET(), { refetch: { onFocus: true } });
useRead((api) => api("posts").GET(), { refetch: { onReconnect: true } });
useRead((api) => api("posts").GET(), {
  refetch: { onFocus: true, onReconnect: true },
});
useRead((api) => api("posts").GET(), {
  refetch: { onFocus: false, onReconnect: false },
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
