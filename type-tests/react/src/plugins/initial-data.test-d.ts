import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { initialDataPlugin } from "@spoosh/plugin-initial-data";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

initialDataPlugin();

// @ts-expect-error - initialDataPlugin does not accept options
initialDataPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  initialDataPlugin(),
]);
const { useRead, usePages } = create(spoosh);

// =============================================================================
// useRead - initialData option
// =============================================================================

useRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
});

useRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: true,
});

useRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: false,
});

// isInitialData result field available
const read = useRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Test" }],
});
expectType<boolean>(read.meta.isInitialData);

// =============================================================================
// useRead - invalid options (options from other plugins should not be available)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });

// =============================================================================
// usePages - initialData option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  initialData: {
    items: [{ id: 1, message: "Initial activity" }],
    nextCursor: null,
  },
  merger: () => [],
});

usePages((api) => api("activities").GET({ query: {} }), {
  initialData: {
    items: [{ id: 1, message: "Initial activity" }],
    nextCursor: null,
  },
  refetchOnInitialData: true,
  merger: () => [],
});
