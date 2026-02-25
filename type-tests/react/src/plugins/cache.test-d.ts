import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

cachePlugin({ staleTime: 5000 });
cachePlugin({ staleTime: Infinity });
cachePlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - staleTime must be number
cachePlugin({ staleTime: "5000" });
// @ts-expect-error - staleTime must be number
cachePlugin({ staleTime: true });
// @ts-expect-error - invalid option key
cachePlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { useRead, useWrite, usePages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - staleTime option (valid)
// =============================================================================

useRead(postsReq, { staleTime: 5000 });
useRead(postsReq, { staleTime: Infinity });
useRead(postsReq, { staleTime: 0 });

// =============================================================================
// useRead - staleTime option (invalid)
// =============================================================================

// @ts-expect-error - staleTime must be number
useRead(postsReq, { staleTime: "5000" });
// @ts-expect-error - staleTime must be number
useRead(postsReq, { staleTime: true });

// =============================================================================
// useWrite - clearCache trigger option (valid)
// =============================================================================

const write = useWrite((api) => api("posts").POST());
write.trigger({ body: { title: "test" }, clearCache: true });
write.trigger({ body: { title: "test" }, clearCache: false });

// =============================================================================
// useWrite - clearCache trigger option (invalid)
// =============================================================================

// @ts-expect-error - clearCache must be boolean
write.trigger({ body: { title: "test" }, clearCache: "true" });
// @ts-expect-error - clearCache must be boolean
write.trigger({ body: { title: "test" }, clearCache: 1 });

// =============================================================================
// usePages - staleTime option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  staleTime: 5000,
  merger: () => [],
});
