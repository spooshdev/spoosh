import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
import { transformPlugin } from "@spoosh/plugin-transform";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

transformPlugin();

// @ts-expect-error - transformPlugin does not accept options
transformPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  transformPlugin(),
]);
const { useRead, useWrite, useQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - transform option (valid)
// =============================================================================

useRead(postsReq, {
  transform: (data) => {
    expectType<{ id: number; title: string }[]>(data);
    return data.map((p) => p.title);
  },
});

useRead(postsReq, {
  transform: (data) => ({ count: data.length }),
});

// async transform
useRead(postsReq, {
  transform: async (data) => data.map((p) => p.title),
});

// =============================================================================
// useRead - transform option (invalid)
// =============================================================================

// @ts-expect-error - transform must be a function
useRead(postsReq, { transform: "invalid" });
// @ts-expect-error - transform must be a function
useRead(postsReq, { transform: true });

// =============================================================================
// useRead - transformedData result field
// =============================================================================

const read = useRead(postsReq, {
  transform: (data) => data.map((p) => p.title),
});

if (read.meta.transformedData !== undefined) {
  expectType<string[]>(read.meta.transformedData);
}

// =============================================================================
// useWrite - transform option (valid)
// =============================================================================

useWrite((api) => api("posts").POST(), {
  transform: (data) => {
    expectType<{ id: number }>(data);
    return { createdId: data.id };
  },
});

// =============================================================================
// useWrite - transform option (invalid)
// =============================================================================

// @ts-expect-error - transform must be a function
useWrite((api) => api("posts").POST(), { transform: "invalid" });

// =============================================================================
// useWrite - transformedData result field
// =============================================================================

const write = useWrite((api) => api("posts").POST(), {
  transform: (data) => ({ createdId: data.id }),
});

if (write.meta.transformedData !== undefined) {
  expectType<{ createdId: number }>(write.meta.transformedData);
}

// =============================================================================
// useQueue - transform option
// =============================================================================

useQueue((api) => api("uploads").POST(), {
  transform: (data) => ({ uploadedUrl: data.url }),
});
