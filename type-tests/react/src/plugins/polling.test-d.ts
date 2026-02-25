import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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
const { useRead } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - pollingInterval option (valid)
// =============================================================================

useRead(postsReq, { pollingInterval: 5000 });
useRead(postsReq, { pollingInterval: false });

useRead(postsReq, {
  pollingInterval: ({ data, error }) => {
    expectType<{ id: number; title: string }[] | undefined>(data);
    expectType<{ customError: string } | undefined>(error);
    return error ? false : 5000;
  },
});

// =============================================================================
// useRead - pollingInterval option (invalid)
// =============================================================================

// @ts-expect-error - pollingInterval must be number, false, or function
useRead(postsReq, { pollingInterval: "5000" });
// @ts-expect-error - pollingInterval must be number, false, or function
useRead(postsReq, { pollingInterval: true });
