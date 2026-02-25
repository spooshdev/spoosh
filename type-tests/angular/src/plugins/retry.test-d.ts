import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
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
const { injectRead, injectWrite, injectPages, injectQueue } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - retry option (valid)
// =============================================================================

injectRead(postsReq, { retry: { retries: 3 } });
injectRead(postsReq, { retry: { retries: 3, delay: 1000 } });
injectRead(postsReq, {
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
injectRead(postsReq, { retry: { retries: false } });

// =============================================================================
// injectRead - retry option (invalid)
// =============================================================================

// @ts-expect-error - retries must be number or false
injectRead(postsReq, { retry: { retries: "3" } });
// @ts-expect-error - retries must be number or false
injectRead(postsReq, { retry: { retries: true } });
// @ts-expect-error - delay must be number
injectRead(postsReq, { retry: { delay: "1000" } });

// =============================================================================
// injectWrite - retry option
// =============================================================================

injectWrite((api) => api("posts").POST(), { retry: { retries: 2 } });
injectWrite((api) => api("posts").POST(), { retry: { retries: false } });

// @ts-expect-error - retries must be number or false
injectWrite((api) => api("posts").POST(), { retry: { retries: "2" } });

// =============================================================================
// injectPages - retry option
// =============================================================================

injectPages((api) => api("activities").GET({ query: {} }), {
  retry: { retries: 2 },
  merger: () => [],
});

// =============================================================================
// injectQueue - retry option
// =============================================================================

injectQueue((api) => api("uploads").POST(), { retry: { retries: 3 } });
injectQueue((api) => api("uploads").POST(), { retry: { retries: false } });
