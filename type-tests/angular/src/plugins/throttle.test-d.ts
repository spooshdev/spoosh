import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
import { throttlePlugin } from "@spoosh/plugin-throttle";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - no options
// =============================================================================

throttlePlugin();

// @ts-expect-error - throttlePlugin does not accept options
throttlePlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  throttlePlugin(),
]);
const { injectRead, injectPages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - throttle option (valid)
// =============================================================================

injectRead(postsReq, { throttle: 1000 });
injectRead(postsReq, { throttle: 500 });

// =============================================================================
// injectRead - throttle option (invalid)
// =============================================================================

// @ts-expect-error - throttle must be number
injectRead(postsReq, { throttle: "1000" });
// @ts-expect-error - throttle must be number
injectRead(postsReq, { throttle: false });

// =============================================================================
// injectPages - throttle option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  throttle: 1000,
  merger: () => [],
});
