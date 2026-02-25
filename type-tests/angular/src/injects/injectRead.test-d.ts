/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh, SpooshResponse } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { injectRead } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

injectRead((api) => api("posts").GET(), {
  // @ts-expect-error - should not allow unknown options
  invalidOption: "test",
});

// =============================================================================
// Data inference
// =============================================================================

const postsRead = injectRead((api) => api("posts").GET());
expectType<{ id: number; title: string }[] | undefined>(postsRead.data());

const postByIdRead = injectRead((api) =>
  api("posts/:id").GET({ params: { id: "1" } })
);
expectType<{ id: number; title: string } | undefined>(postByIdRead.data());

const usersRead = injectRead((api) => api("users").GET());
expectType<{ name: string }[] | undefined>(usersRead.data());

// =============================================================================
// Error inference - per-endpoint error
// =============================================================================

const postsError = postsRead.error();
if (postsError) {
  expectType<{ customError: string }>(postsError);
  expectType<string>(postsError.customError);

  // @ts-expect-error - message is DefaultError, not posts error
  postsError.message;
}

const postByIdError = postByIdRead.error();
if (postByIdError) {
  expectType<{ notFound: boolean }>(postByIdError);
  expectType<boolean>(postByIdError.notFound);

  // @ts-expect-error - customError is posts error, not posts/:id error
  postByIdError.customError;
}

// =============================================================================
// Error inference - default error fallback
// =============================================================================

const usersError = usersRead.error();
if (usersError) {
  expectType<{ message: string }>(usersError);
  expectType<string>(usersError.message);

  // @ts-expect-error - customError doesn't exist on default error
  usersError.customError;
}

// =============================================================================
// Loading states (signals)
// =============================================================================

expectType<boolean>(postsRead.loading());
expectType<boolean>(postsRead.fetching());

// =============================================================================
// Meta field (signal)
// =============================================================================

postsRead.meta();

// =============================================================================
// Trigger function
// =============================================================================

postsRead.trigger();
postByIdRead.trigger();

// Trigger with force option
postsRead.trigger({ force: true });
// @ts-expect-error - force must be boolean
postsRead.trigger({ force: "true" });

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
injectRead((api) => api("posts/:id").GET());
