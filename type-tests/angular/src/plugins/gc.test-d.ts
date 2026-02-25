import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { gcPlugin } from "@spoosh/plugin-gc";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

gcPlugin({ interval: 60000 });
gcPlugin({ maxAge: 300000 });
gcPlugin({ maxEntries: 100 });
gcPlugin({ interval: 60000, maxAge: 300000 });
gcPlugin({ interval: 60000, maxAge: 300000, maxEntries: 100 });
gcPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - interval must be number
gcPlugin({ interval: "60000" });
// @ts-expect-error - maxAge must be number
gcPlugin({ maxAge: "300000" });
// @ts-expect-error - maxEntries must be number
gcPlugin({ maxEntries: "100" });
// @ts-expect-error - invalid option key
gcPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([gcPlugin()]);
const { runGc } = create(spoosh);

// =============================================================================
// Instance API - runGc
// =============================================================================

const removedCount = runGc();
expectType<number>(removedCount);
