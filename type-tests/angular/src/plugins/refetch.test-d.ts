import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/angular";
import { refetchPlugin } from "@spoosh/plugin-refetch";
import type { TestSchema, DefaultError } from "../schema.js";

// =============================================================================
// Plugin config - valid options
// =============================================================================

refetchPlugin({ refetchOnFocus: true });
refetchPlugin({ refetchOnReconnect: true });
refetchPlugin({ refetchOnFocus: true, refetchOnReconnect: true });
refetchPlugin({ refetchOnFocus: false, refetchOnReconnect: false });
refetchPlugin({});

// =============================================================================
// Plugin config - invalid options
// =============================================================================

// @ts-expect-error - refetchOnFocus must be boolean
refetchPlugin({ refetchOnFocus: "true" });
// @ts-expect-error - refetchOnReconnect must be boolean
refetchPlugin({ refetchOnReconnect: "true" });
// @ts-expect-error - invalid option key
refetchPlugin({ invalidKey: true });

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  refetchPlugin(),
]);
const { injectRead } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// injectRead - refetch option (valid)
// =============================================================================

injectRead(postsReq, { refetch: { onFocus: true } });
injectRead(postsReq, { refetch: { onReconnect: true } });
injectRead(postsReq, { refetch: { onFocus: true, onReconnect: true } });
injectRead(postsReq, { refetch: { onFocus: false, onReconnect: false } });

// =============================================================================
// injectRead - refetch option (invalid)
// =============================================================================

// @ts-expect-error - onFocus must be boolean
injectRead(postsReq, { refetch: { onFocus: "true" } });
// @ts-expect-error - onReconnect must be boolean
injectRead(postsReq, { refetch: { onReconnect: "true" } });
