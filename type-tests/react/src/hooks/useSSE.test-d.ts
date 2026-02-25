/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { sse } from "@spoosh/transport-sse";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api")
  .use([cachePlugin()])
  .withTransports([sse()]);
const { useSSE } = create(spoosh);

// =============================================================================
// Basic usage - notifications endpoint
// =============================================================================

const notifications = useSSE((api) => api("notifications").GET());

// =============================================================================
// Data inference - accumulated events
// =============================================================================

expectType<
  | Partial<{ alert: { level: string }; message: { content: string } }>
  | undefined
>(notifications.data);

if (notifications.data?.alert) {
  expectType<{ level: string }>(notifications.data.alert);
  expectType<string>(notifications.data.alert.level);
}

if (notifications.data?.message) {
  expectType<{ content: string }>(notifications.data.message);
  expectType<string>(notifications.data.message.content);
}

// =============================================================================
// Error inference - per-endpoint error
// =============================================================================

if (notifications.error) {
  expectType<{ connectionError: boolean }>(notifications.error);
  expectType<boolean>(notifications.error.connectionError);

  // @ts-expect-error - message is DefaultError, not notifications error
  notifications.error.message;
}

// =============================================================================
// Events stream endpoint - default error fallback
// =============================================================================

const eventsStream = useSSE((api) => api("events/stream").GET());

expectType<Partial<{ update: { value: number } }> | undefined>(
  eventsStream.data
);

if (eventsStream.data?.update) {
  expectType<{ value: number }>(eventsStream.data.update);
  expectType<number>(eventsStream.data.update.value);
}

if (eventsStream.error) {
  expectType<{ message: string }>(eventsStream.error);
  expectType<string>(eventsStream.error.message);

  // @ts-expect-error - connectionError is notifications error, not default error
  eventsStream.error.connectionError;
}

// =============================================================================
// Connection state
// =============================================================================

expectType<boolean>(notifications.isConnected);
expectType<boolean>(notifications.loading);

// =============================================================================
// Meta field
// =============================================================================

expectType<Record<string, never>>(notifications.meta);

// =============================================================================
// Trigger function
// =============================================================================

notifications.trigger();
notifications.trigger({ body: { data: "test" } });
notifications.trigger({ query: { filter: "all" } });
const triggerResult = notifications.trigger();
expectType<Promise<void>>(triggerResult);

// =============================================================================
// Disconnect function
// =============================================================================

notifications.disconnect();

// =============================================================================
// Reset function
// =============================================================================

notifications.reset();
