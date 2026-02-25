import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

invalidationPlugin({ defaultMode: "all" });
invalidationPlugin({ defaultMode: "self" });
invalidationPlugin({ defaultMode: "none" });
invalidationPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - invalid defaultMode
invalidationPlugin({ defaultMode: "invalid" });
// @ts-expect-error - invalid option key
invalidationPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  invalidationPlugin(),
]);
const { injectWrite, injectQueue, invalidate } = create(spoosh);

// =============================================================================
// injectWrite - invalidate trigger option
// =============================================================================

const write = injectWrite((api) => api("posts").POST());

write.trigger({ body: { title: "test" }, invalidate: "posts" });
write.trigger({ body: { title: "test" }, invalidate: "all" });
write.trigger({ body: { title: "test" }, invalidate: ["posts", "users"] });
write.trigger({ body: { title: "test" }, invalidate: "*" });

// =============================================================================
// injectQueue - invalidate trigger option
// =============================================================================

const queue = injectQueue((api) => api("uploads").POST());

queue.trigger({ body: new FormData(), invalidate: "posts" });
queue.trigger({ body: new FormData(), invalidate: ["posts", "users"] });
queue.trigger({ body: new FormData(), invalidate: "*" });
queue.trigger({ body: new FormData(), invalidate: "all" });

// =============================================================================
// Instance API - invalidate
// =============================================================================

invalidate("posts");
invalidate(["posts", "users"]);
invalidate("*");
