import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
import { pollingPlugin } from "@spoosh/plugin-polling";
import type { TestSchema, DefaultError } from "../schema.js";
import { expectType } from "tsd";

// =============================================================================
// Plugin config - no options
// =============================================================================

pollingPlugin();

// @ts-expect-error - pollingPlugin does not accept options
pollingPlugin({});

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  pollingPlugin(),
]);
const { injectRead } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - pollingInterval option (valid)
// =============================================================================

injectRead(postsReq, { pollingInterval: 5000 });
injectRead(postsReq, { pollingInterval: false });

injectRead(postsReq, {
  pollingInterval: ({ data, error }) => {
    expectType<{ id: number; title: string }[] | undefined>(data);
    expectType<{ customError: string } | undefined>(error);
    return error ? false : 5000;
  },
});

// =============================================================================
// injectRead - pollingInterval option (invalid)
// =============================================================================

// @ts-expect-error - pollingInterval must be number, false, or function
injectRead(postsReq, { pollingInterval: "5000" });
// @ts-expect-error - pollingInterval must be number, false, or function
injectRead(postsReq, { pollingInterval: true });
