import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";
import { retryPlugin } from "@spoosh/plugin-retry";
import { deduplicationPlugin } from "@spoosh/plugin-deduplication";
import { devtool } from "@spoosh/devtool";
import type { ApiSchema, ApiError } from "./schema";

const spoosh = new Spoosh<ApiSchema, ApiError>("/api").use([
  cachePlugin({ staleTime: 5_000 }),
  deduplicationPlugin(),
  invalidationPlugin(),
  retryPlugin({
    retries: 3,
    retryDelay: 400,
  }),
  devtool({ enabled: true }),
]);

export const { useRead, useWrite, usePages } = create(spoosh);
