import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
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
const { injectRead, injectPages } = create(spoosh);

// =============================================================================
// injectRead - initialData option
// =============================================================================

injectRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
});

injectRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: true,
});

injectRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: false,
});

// isInitialData result field available
const read = injectRead((api) => api("posts").GET(), {
  initialData: [{ id: 1, title: "Test" }],
});
expectType<boolean>(read.meta().isInitialData);

// =============================================================================
// injectPages - initialData option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  initialData: {
    items: [{ id: 1, message: "Initial activity" }],
    nextCursor: null,
  },
  merger: () => [],
});

injectPages((api) => api("activities").GET({ query: {} }), {
  initialData: {
    items: [{ id: 1, message: "Initial activity" }],
    nextCursor: null,
  },
  refetchOnInitialData: true,
  merger: () => [],
});
