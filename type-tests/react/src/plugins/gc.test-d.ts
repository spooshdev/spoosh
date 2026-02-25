import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { gcPlugin } from "@spoosh/plugin-gc";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

gcPlugin({ interval: 60000 });
gcPlugin({ maxAge: 300000 });
gcPlugin({ interval: 60000, maxAge: 300000 });
gcPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - interval must be number
gcPlugin({ interval: "60000" });
// @ts-expect-error - maxAge must be number
gcPlugin({ maxAge: "300000" });
// @ts-expect-error - invalid option key
gcPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([gcPlugin()]);
const { useRead, runGc } = create(spoosh);

// =============================================================================
// Instance API - runGc
// =============================================================================

const removedCount = runGc();
expectType<number>(removedCount);

// =============================================================================
// useRead - invalid options (gc plugin doesn't add hook options)
// =============================================================================

// @ts-expect-error - staleTime is from cache plugin, not installed
useRead((api) => api("posts").GET(), { staleTime: 5000 });
// @ts-expect-error - retry is from retry plugin, not installed
useRead((api) => api("posts").GET(), { retry: { retries: 3 } });
// @ts-expect-error - dedupe is from deduplication plugin, not installed
useRead((api) => api("posts").GET(), { dedupe: false });
