import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - initialData option (valid)
// =============================================================================

useRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
});

useRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: true,
});

useRead(postsReq, {
  initialData: [{ id: 1, title: "Initial Post" }],
  refetchOnInitialData: false,
});

// =============================================================================
// useRead - initialData option (invalid)
// =============================================================================

// @ts-expect-error - refetchOnInitialData must be boolean
useRead(postsReq, { initialData: [], refetchOnInitialData: "true" });
// @ts-expect-error - refetchOnInitialData must be boolean
useRead(postsReq, { initialData: [], refetchOnInitialData: 1 });

// =============================================================================
// useRead - isInitialData result field
// =============================================================================

const read = useRead(postsReq, {
  initialData: [{ id: 1, title: "Test" }],
});
expectType<boolean>(read.meta.isInitialData);

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
