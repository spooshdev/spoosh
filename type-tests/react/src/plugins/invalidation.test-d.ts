import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { invalidationPlugin } from "@spoosh/plugin-invalidation";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

invalidationPlugin({ autoInvalidate: true });
invalidationPlugin({ autoInvalidate: false });
invalidationPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - autoInvalidate must be boolean
invalidationPlugin({ autoInvalidate: "invalid" });
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
write.trigger({ body: { title: "test" }, invalidate: "posts/*" });
write.trigger({ body: { title: "test" }, invalidate: ["posts", "posts/*"] });
write.trigger({ body: { title: "test" }, invalidate: ["posts", "users"] });
write.trigger({ body: { title: "test" }, invalidate: "*" });
write.trigger({ body: { title: "test" }, invalidate: false });

// =============================================================================
// useQueue - invalidate trigger option (valid)
// =============================================================================

const queue = useQueue((api) => api("uploads").POST());

queue.trigger({ body: new FormData(), invalidate: "posts" });
queue.trigger({ body: new FormData(), invalidate: "posts/*" });
queue.trigger({ body: new FormData(), invalidate: ["posts", "users"] });
queue.trigger({ body: new FormData(), invalidate: "*" });
queue.trigger({ body: new FormData(), invalidate: false });

// =============================================================================
// Instance API - invalidate (valid)
// =============================================================================

invalidate("posts");
invalidate("posts/*");
invalidate(["posts", "users"]);
invalidate(["posts", "posts/*"]);
invalidate("*");
