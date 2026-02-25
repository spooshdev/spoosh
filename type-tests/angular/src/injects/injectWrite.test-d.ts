/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh, SpooshResponse } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { injectWrite } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

injectWrite((api) => api("posts").POST(), {
  // @ts-expect-error - should not allow unknown options
  invalidOption: "test",
});

// =============================================================================
// Data inference - POST
// =============================================================================

const createPost = injectWrite((api) => api("posts").POST());
expectType<{ id: number } | undefined>(createPost.data());

// =============================================================================
// Data inference - PUT
// =============================================================================

const updatePost = injectWrite((api) => api("posts/:id").PUT());
expectType<{ id: number; title: string } | undefined>(updatePost.data());

// =============================================================================
// Data inference - DELETE
// =============================================================================

const deletePost = injectWrite((api) => api("posts/:id").DELETE());
expectType<{ success: boolean } | undefined>(deletePost.data());

// =============================================================================
// Error inference - per-endpoint error
// =============================================================================

const createError = createPost.error();
if (createError) {
  expectType<{ validation: string[] }>(createError);
  expectType<string[]>(createError.validation);

  // @ts-expect-error - message is DefaultError, not posts POST error
  createError.message;
}

const updateError = updatePost.error();
if (updateError) {
  expectType<{ notFound: boolean }>(updateError);
  expectType<boolean>(updateError.notFound);

  // @ts-expect-error - validation is posts POST error, not posts/:id PUT error
  updateError.validation;
}

const deleteError = deletePost.error();
if (deleteError) {
  expectType<{ notFound: boolean }>(deleteError);
  expectType<boolean>(deleteError.notFound);

  // @ts-expect-error - message is DefaultError, not posts/:id DELETE error
  deleteError.message;
}

// =============================================================================
// Error inference - default error fallback
// =============================================================================

const usersWrite = injectWrite((api) => api("users").POST());
const usersError = usersWrite.error();
if (usersError) {
  expectType<{ message: string }>(usersError);
  expectType<string>(usersError.message);

  // @ts-expect-error - validation is posts POST error, not default error
  usersError.validation;
}

// =============================================================================
// Loading states (signal)
// =============================================================================

expectType<boolean>(createPost.loading());

// =============================================================================
// Meta field (signal)
// =============================================================================

createPost.meta();

// =============================================================================
// Trigger function - body validation
// =============================================================================

createPost.trigger({ body: { title: "New Post" } });

// @ts-expect-error - body is required for POST
createPost.trigger({});

// @ts-expect-error - body must match schema
createPost.trigger({ body: { invalidField: "test" } });

// =============================================================================
// Trigger function - params validation
// =============================================================================

updatePost.trigger({
  params: { id: "1" },
  body: { title: "Updated Post" },
});

// @ts-expect-error - params required for posts/:id
updatePost.trigger({ body: { title: "Updated Post" } });

deletePost.trigger({ params: { id: "1" } });

// =============================================================================
// Trigger return type
// =============================================================================

const createResult = createPost.trigger({ body: { title: "Test" } });
expectType<Promise<SpooshResponse<{ id: number }, { validation: string[] }>>>(
  createResult
);

const updateResult = updatePost.trigger({
  params: { id: "1" },
  body: { title: "Updated" },
});
expectType<
  Promise<SpooshResponse<{ id: number; title: string }, { notFound: boolean }>>
>(updateResult);

// =============================================================================
// Abort function
// =============================================================================

createPost.abort();
updatePost.abort();
deletePost.abort();
