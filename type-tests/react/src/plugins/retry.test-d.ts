import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
import { retryPlugin } from "@spoosh/plugin-retry";
import type { TestSchema, DefaultError } from "../schema.js";
import { expectType } from "tsd";

// =============================================================================
// Plugin config - valid options
// =============================================================================

retryPlugin({ retries: 5 });
retryPlugin({ retries: 3, retryDelay: 2000 });
retryPlugin({ retries: false });
retryPlugin({
  shouldRetry: (ctx) => {
    expectType<number>(ctx.attempt);
    expectType<number | undefined>(ctx.status);
    return ctx.attempt < 3;
  },
});
retryPlugin({
  retries: 3,
  retryDelay: 1000,
  shouldRetry: (ctx) => ctx.status !== 404,
});
retryPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - retries must be number or false
retryPlugin({ retries: "3" });
// @ts-expect-error - retries must be number or false
retryPlugin({ retries: true });
// @ts-expect-error - retryDelay must be number
retryPlugin({ retryDelay: "1000" });
// @ts-expect-error - invalid option key
retryPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  retryPlugin(),
]);
const { useRead, useWrite, usePages, useQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - retry option (valid)
// =============================================================================

useRead(postsReq, { retry: { retries: 3 } });
useRead(postsReq, { retry: { retries: 3, delay: 1000 } });
useRead(postsReq, {
  retry: {
    retries: 3,
    delay: 1000,
    shouldRetry: (ctx) => {
      expectType<number>(ctx.attempt);
      expectType<number | undefined>(ctx.status);
      return ctx.status !== 404;
    },
  },
});
useRead(postsReq, { retry: { retries: false } });

// =============================================================================
// useRead - retry option (invalid)
// =============================================================================

// @ts-expect-error - retries must be number or false
useRead(postsReq, { retry: { retries: "3" } });
// @ts-expect-error - retries must be number or false
useRead(postsReq, { retry: { retries: true } });
// @ts-expect-error - delay must be number
useRead(postsReq, { retry: { delay: "1000" } });

// =============================================================================
// useWrite - retry option
// =============================================================================

useWrite((api) => api("posts").POST(), { retry: { retries: 2 } });
useWrite((api) => api("posts").POST(), { retry: { retries: false } });

// @ts-expect-error - retries must be number or false
useWrite((api) => api("posts").POST(), { retry: { retries: "2" } });

// =============================================================================
// usePages - retry option
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  retry: { retries: 2 },
  merger: () => [],
});

// =============================================================================
// useQueue - retry option
// =============================================================================

useQueue((api) => api("uploads").POST(), { retry: { retries: 3 } });
useQueue((api) => api("uploads").POST(), { retry: { retries: false } });
