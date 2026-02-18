import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { debouncePlugin } from "@spoosh/plugin-debounce";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";
import { gcPlugin } from "@spoosh/plugin-gc";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";
import { optimisticPlugin } from "@spoosh/plugin-optimistic";
import { pollingPlugin } from "@spoosh/plugin-polling";
import { prefetchPlugin } from "@spoosh/plugin-prefetch";
import { progressPlugin } from "@spoosh/plugin-progress";
import { refetchPlugin } from "@spoosh/plugin-refetch";
import { retryPlugin } from "@spoosh/plugin-retry";
import { transformPlugin } from "@spoosh/plugin-transform";
import { devtool } from "@spoosh/devtool";
import { mswRecoveryPlugin } from "../plugins/msw-recovery";
import type { ApiError, ApiSchema } from "./schema";

const spoosh = new Spoosh<ApiSchema, ApiError>("/api").use([
  mswRecoveryPlugin(),
  cachePlugin({ staleTime: 6_000 }),
  deduplicationPlugin(),
  retryPlugin({
    retries: 3,
    retryDelay: 500,
    shouldRetry: ({ status }) => status !== undefined && status >= 500,
  }),
  invalidationPlugin(),
  optimisticPlugin(),
  prefetchPlugin(),
  pollingPlugin(),
  refetchPlugin({ refetchOnReconnect: true }),
  debouncePlugin(),
  transformPlugin(),
  progressPlugin(),
  gcPlugin({ maxEntries: 120, maxAge: 120_000, interval: 30_000 }),
  devtool({ containerId: "spoosh-devtool-container" }),
]);

export const {
  useRead,
  useWrite,
  usePages,
  prefetch,
  invalidate,
  clearCache,
  runGc,
} = create(spoosh);
