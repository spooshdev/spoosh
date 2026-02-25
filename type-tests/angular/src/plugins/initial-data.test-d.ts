import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - initialData option (valid)
// =============================================================================

injectRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
});

injectRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: true,
});

injectRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: false,
});

// =============================================================================
// injectRead - initialData option (invalid)
// =============================================================================

// @ts-expect-error - refetchOnInitialData must be boolean
injectRead(postsReq, { initialData: [], refetchOnInitialData: "true" });
// @ts-expect-error - refetchOnInitialData must be boolean
injectRead(postsReq, { initialData: [], refetchOnInitialData: 1 });

// =============================================================================
// injectRead - isInitialData result field
// =============================================================================

const read = injectRead(postsReq, {
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
