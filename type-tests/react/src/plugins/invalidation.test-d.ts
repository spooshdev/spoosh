import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
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

// @ts-expect-error - defaultMode must be "all" | "self" | "none"
invalidationPlugin({ defaultMode: "invalid" });
// @ts-expect-error - defaultMode must be string
invalidationPlugin({ defaultMode: true });
// @ts-expect-error - invalid option key
invalidationPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  invalidationPlugin(),
]);
const { useWrite, useQueue, invalidate } = create(spoosh);

// =============================================================================
// useWrite - invalidate trigger option (valid)
// =============================================================================

const write = useWrite((api) => api("posts").POST());

write.trigger({ body: { title: "test" }, invalidate: "posts" });
write.trigger({ body: { title: "test" }, invalidate: "all" });
write.trigger({ body: { title: "test" }, invalidate: "self" });
write.trigger({ body: { title: "test" }, invalidate: "none" });
write.trigger({ body: { title: "test" }, invalidate: ["posts", "users"] });
write.trigger({ body: { title: "test" }, invalidate: "*" });

// =============================================================================
// useQueue - invalidate trigger option (valid)
// =============================================================================

const queue = useQueue((api) => api("uploads").POST());

queue.trigger({ body: new FormData(), invalidate: "posts" });
queue.trigger({ body: new FormData(), invalidate: ["posts", "users"] });
queue.trigger({ body: new FormData(), invalidate: "*" });
queue.trigger({ body: new FormData(), invalidate: "all" });
queue.trigger({ body: new FormData(), invalidate: "self" });
queue.trigger({ body: new FormData(), invalidate: "none" });

// =============================================================================
// Instance API - invalidate (valid)
// =============================================================================

invalidate("posts");
invalidate(["posts", "users"]);
invalidate("*");
