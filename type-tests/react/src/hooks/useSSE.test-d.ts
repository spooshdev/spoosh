/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create, SubscriptionApiClient } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { sse } from "@spoosh/transport-sse";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api")
  .use([cachePlugin()])
  .withTransports([sse()]);
const { useSSE } = create(spoosh);

const notiReq = (api: SubscriptionApiClient<TestSchema, DefaultError>) =>
  api("notifications").GET();

// =============================================================================
// Hook Options
// =============================================================================

useSSE(notiReq, { events: ["alert", "message"] });
// @ts-expect-error - events should be known event names from the schema
useSSE(notiReq, { events: ["invalid"] });
// @ts-expect-error - events should be an array of strings
useSSE(notiReq, { events: "alert" });

// ----------------------------------------------------------------------------
// Parse option
// ----------------------------------------------------------------------------

useSSE(notiReq, { parse: "auto" });
useSSE(notiReq, { parse: "json-done" });
useSSE(notiReq, { parse: "json" });
useSSE(notiReq, { parse: "text" });
useSSE(notiReq, { parse: { alert: "text" } });
useSSE(notiReq, {
  parse: (str) => {
    // Assert parse function input is string
    expectType<string>(str);
    return { alert: { level: str } };
  },
});

// @ts-expect-error - parse function must return correct payload type for known key
useSSE(notiReq, { parse: (str) => ({ alert: true }) });

// @ts-expect-error - parse function must return valid event structure
useSSE(notiReq, { parse: () => ({ invalid: true }) });
// @ts-expect-error - parse should be a known parsing strategy
useSSE(notiReq, { parse: "invalid" });
// @ts-expect-error - parse should be a known event name from the schema
useSSE(notiReq, { parse: { invalid: "text" } });

// ----------------------------------------------------------------------------
// Accumulate option
// ----------------------------------------------------------------------------

useSSE(notiReq, { accumulate: "merge" });
useSSE(notiReq, { accumulate: "replace" });
useSSE(notiReq, { accumulate: { alert: "replace" } });
// @ts-expect-error - accumulate should be a known accumulation strategy
useSSE(notiReq, { accumulate: "event" });
// @ts-expect-error - accumulate should be a known event name from the schema
useSSE(notiReq, { accumulate: { invalid: "replace" } });

useSSE(notiReq, {
  accumulate: {
    alert: (prev, next) => {
      // Assert accumulate prev/next types
      expectType<{ level: string } | undefined>(prev);
      expectType<{ level: string }>(next);
      return { level: next.level };
    },
  },
});
useSSE(notiReq, {
  // @ts-expect-error - accumulate should only support known event names
  accumulate: { invalid: (_, next) => ({ level: next.level }) },
});
// @ts-expect-error - accumulate return type must match event type
useSSE(notiReq, { accumulate: { alert: () => "nope" } });
// @ts-expect-error - accumulate map should not allow extra keys
useSSE(notiReq, { accumulate: { alert: "replace", extra: "replace" } });
// @ts-expect-error - accumulate should be a known accumulation strategy, not a function
useSSE(notiReq, { accumulate: () => "" });
// @ts-expect-error - should not allow unknown options
useSSE(notiReq, { invalidOption: "test" });

// =============================================================================
// Basic usage - notifications endpoint
// =============================================================================

const notifications = useSSE(notiReq);

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

const stream = useSSE((api) => api("events/stream").GET());

expectType<Partial<{ update: { value: number } }> | undefined>(stream.data);

if (stream.data?.update) {
  expectType<{ value: number }>(stream.data.update);
  expectType<number>(stream.data.update.value);
}

if (stream.error) {
  expectType<{ message: string }>(stream.error);
  expectType<string>(stream.error.message);

  // @ts-expect-error - connectionError is notifications error, not default error
  stream.error.connectionError;
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
// Trigger function - basic (no schema-defined inputs)
// =============================================================================

notifications.trigger();
notifications.trigger({});
const triggerResult = notifications.trigger();
expectType<Promise<void>>(triggerResult);

// =============================================================================
// Trigger function - with params/query/body from schema
// =============================================================================

// =============================================================================
// Trigger function - with params/query/body from schema
// =============================================================================

const chatRoom = useSSE((api) =>
  api("chat/:roomId").GET({ params: { roomId: "123" } })
);

// Valid trigger calls - should compile without errors
chatRoom.trigger();
chatRoom.trigger({});
chatRoom.trigger({ params: { roomId: "456" } });
chatRoom.trigger({ query: { since: 100 } });
chatRoom.trigger({ body: { token: "abc" } });
chatRoom.trigger({
  params: { roomId: "room1" },
  query: { since: 0 },
  body: { token: "test" },
});

// @ts-expect-error - params key must be "roomId", not something else
chatRoom.trigger({ params: { invalidKey: "456" } });

// @ts-expect-error - query.since must be number, not string
chatRoom.trigger({ query: { since: "invalid" } });

// @ts-expect-error - body.token must be string, not number
chatRoom.trigger({ body: { token: 123 } });

// @ts-expect-error - unknown option not allowed
chatRoom.trigger({ unknownOption: true });

// =============================================================================
// Disconnect function
// =============================================================================

notifications.disconnect();

// =============================================================================
// Reset function
// =============================================================================

notifications.reset();
