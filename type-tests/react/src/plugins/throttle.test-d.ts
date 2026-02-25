import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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
const { useRead, usePages } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - throttle option (valid)
// =============================================================================

useRead(postsReq, { throttle: 1000 });
useRead(postsReq, { throttle: 500 });

// =============================================================================
// useRead - throttle option (invalid)
// =============================================================================

// @ts-expect-error - throttle must be number
useRead(postsReq, { throttle: "1000" });
// @ts-expect-error - throttle must be number
useRead(postsReq, { throttle: false });

// =============================================================================
// usePages - throttle option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  throttle: 1000,
  merger: () => [],
});
