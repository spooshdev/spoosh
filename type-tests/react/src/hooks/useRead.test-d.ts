/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh, SpooshResponse } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { useRead } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

// @ts-expect-error - should not allow unknown options
useRead((api) => api("posts").GET(), { invalidOption: "test" });

// =============================================================================
// Data inference
// =============================================================================

const postsRead = useRead((api) => api("posts").GET());
expectType<{ id: number; title: string }[] | undefined>(postsRead.data);

const postByIdRead = useRead((api) =>
  api("posts/:id").GET({ params: { id: "1" } })
);
expectType<{ id: number; title: string } | undefined>(postByIdRead.data);

const usersRead = useRead((api) => api("users").GET());
expectType<{ name: string }[] | undefined>(usersRead.data);

// =============================================================================
// Error inference - per-endpoint error
// =============================================================================

if (postsRead.error) {
  expectType<{ customError: string }>(postsRead.error);
  expectType<string>(postsRead.error.customError);

  // @ts-expect-error - message is DefaultError, not posts error
  postsRead.error.message;
}

if (postByIdRead.error) {
  expectType<{ notFound: boolean }>(postByIdRead.error);
  expectType<boolean>(postByIdRead.error.notFound);

  // @ts-expect-error - customError is posts error, not posts/:id error
  postByIdRead.error.customError;
}

// =============================================================================
// Error inference - default error fallback
// =============================================================================

if (usersRead.error) {
  expectType<{ message: string }>(usersRead.error);
  expectType<string>(usersRead.error.message);

  // @ts-expect-error - customError doesn't exist on default error
  usersRead.error.customError;
}

// =============================================================================
// Loading states
// =============================================================================

expectType<boolean>(postsRead.loading);
expectType<boolean>(postsRead.fetching);

// =============================================================================
// Meta field
// =============================================================================

postsRead.meta;

// =============================================================================
// Trigger function
// =============================================================================

postsRead.trigger();
postByIdRead.trigger();

// Trigger with force option
postsRead.trigger({ force: true });

// Trigger return type
const triggerResult = postsRead.trigger();
expectType<
  Promise<
    SpooshResponse<{ id: number; title: string }[], { customError: string }>
  >
>(triggerResult);

// =============================================================================
// Abort function
// =============================================================================

postsRead.abort();
postByIdRead.abort();

// =============================================================================
// Params validation
// =============================================================================

// @ts-expect-error - posts/:id requires params
useRead((api) => api("posts/:id").GET());
