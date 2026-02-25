import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectPages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - staleTime option (valid)
// =============================================================================

injectRead(postsReq, { staleTime: 5000 });
injectRead(postsReq, { staleTime: Infinity });
injectRead(postsReq, { staleTime: 0 });

// =============================================================================
// injectRead - staleTime option (invalid)
// =============================================================================

// @ts-expect-error - staleTime must be number
injectRead(postsReq, { staleTime: "5000" });
// @ts-expect-error - staleTime must be number
injectRead(postsReq, { staleTime: true });

// =============================================================================
// injectWrite - clearCache trigger option (valid)
// =============================================================================

const write = injectWrite((api) => api("posts").POST());
write.trigger({ body: { title: "test" }, clearCache: true });
write.trigger({ body: { title: "test" }, clearCache: false });

// =============================================================================
// injectWrite - clearCache trigger option (invalid)
// =============================================================================

// @ts-expect-error - clearCache must be boolean
write.trigger({ body: { title: "test" }, clearCache: "true" });
// @ts-expect-error - clearCache must be boolean
write.trigger({ body: { title: "test" }, clearCache: 1 });

// =============================================================================
// injectPages - staleTime option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  staleTime: 5000,
  merger: () => [],
});
