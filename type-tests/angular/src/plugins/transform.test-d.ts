import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - transform option (valid)
// =============================================================================

injectRead(postsReq, {
  transform: (data) => {
    expectType<{ id: number; title: string }[]>(data);
    return data.map((p) => p.title);
  },
});

injectRead(postsReq, {
  transform: (data) => ({ count: data.length }),
});

// async transform
injectRead(postsReq, {
  transform: async (data) => data.map((p) => p.title),
});

// =============================================================================
// injectRead - transform option (invalid)
// =============================================================================

// @ts-expect-error - transform must be a function
injectRead(postsReq, { transform: "invalid" });
// @ts-expect-error - transform must be a function
injectRead(postsReq, { transform: true });

// =============================================================================
// injectRead - transformedData result field
// =============================================================================

const read = injectRead(postsReq, {
  transform: (data) => data.map((p) => p.title),
});

const transformedReadData = read.meta().transformedData;
if (transformedReadData !== undefined) {
  expectType<string[]>(transformedReadData);
}

// =============================================================================
// injectWrite - transform option (valid)
// =============================================================================

injectWrite((api) => api("posts").POST(), {
  transform: (data) => {
    expectType<{ id: number }>(data);
    return { createdId: data.id };
  },
});

// =============================================================================
// injectWrite - transform option (invalid)
// =============================================================================

// @ts-expect-error - transform must be a function
injectWrite((api) => api("posts").POST(), { transform: "invalid" });

// =============================================================================
// injectWrite - transformedData result field
// =============================================================================

const write = injectWrite((api) => api("posts").POST(), {
  transform: (data) => ({ createdId: data.id }),
});

const transformedWriteData = write.meta().transformedData;
if (transformedWriteData !== undefined) {
  expectType<{ createdId: number }>(transformedWriteData);
}

// =============================================================================
// injectQueue - transform option
// =============================================================================

injectQueue((api) => api("uploads").POST(), {
  transform: (data) => ({ uploadedUrl: data.url }),
});
