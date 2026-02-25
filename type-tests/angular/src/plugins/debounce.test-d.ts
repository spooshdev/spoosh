import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
import { debouncePlugin } from "@spoosh/plugin-debounce";
import type { TestSchema, DefaultError } from "../schema.js";
import { expectType } from "tsd";

// =============================================================================
// Plugin config - no options
// =============================================================================

debouncePlugin();

// @ts-expect-error - debouncePlugin does not accept options
debouncePlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  debouncePlugin(),
]);
const { injectRead } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - debounce option (valid)
// =============================================================================

injectRead(postsReq, { debounce: 300 });
injectRead(postsReq, { debounce: () => 500 });

injectRead((api) => api("activities").GET({ query: {} }), {
  debounce: ({ prevQuery }) => {
    expectType<{ limit?: number; cursor?: number } | undefined>(prevQuery);
    expectType<number | undefined>(prevQuery?.limit);
    return prevQuery?.limit ? 300 : 0;
  },
});

// =============================================================================
// injectRead - debounce option (invalid)
// =============================================================================

// @ts-expect-error - debounce must be number or function
injectRead(postsReq, { debounce: "300" });
// @ts-expect-error - debounce must be number or function
injectRead(postsReq, { debounce: false });
