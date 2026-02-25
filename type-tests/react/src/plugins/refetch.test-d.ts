import { Spoosh } from "@spoosh/core";
import { create, type ReadApiClient } from "@spoosh/react";
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
const { useRead } = create(spoosh);

const postsReq = (api: ReadApiClient<TestSchema, DefaultError>) =>
  api("posts").GET();

// =============================================================================
// useRead - refetch option (valid)
// =============================================================================

useRead(postsReq, { refetch: { onFocus: true } });
useRead(postsReq, { refetch: { onReconnect: true } });
useRead(postsReq, { refetch: { onFocus: true, onReconnect: true } });
useRead(postsReq, { refetch: { onFocus: false, onReconnect: false } });

// =============================================================================
// useRead - refetch option (invalid)
// =============================================================================

// @ts-expect-error - onFocus must be boolean
useRead(postsReq, { refetch: { onFocus: "true" } });
// @ts-expect-error - onReconnect must be boolean
useRead(postsReq, { refetch: { onReconnect: "true" } });
