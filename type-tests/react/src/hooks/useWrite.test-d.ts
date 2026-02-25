/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh, SpooshResponse } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { useWrite } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

// @ts-expect-error - should not allow unknown options
useWrite((api) => api("posts").POST(), { invalidOption: "test" });

// =============================================================================
// Data inference - POST
// =============================================================================

const createPost = useWrite((api) => api("posts").POST());
expectType<{ id: number } | undefined>(createPost.data);

// =============================================================================
// Data inference - PUT
// =============================================================================

const updatePost = useWrite((api) => api("posts/:id").PUT());
expectType<{ id: number; title: string } | undefined>(updatePost.data);

// =============================================================================
// Data inference - DELETE
// =============================================================================

const deletePost = useWrite((api) => api("posts/:id").DELETE());
expectType<{ success: boolean } | undefined>(deletePost.data);

// =============================================================================
// Error inference - per-endpoint error
// =============================================================================

if (createPost.error) {
  expectType<{ validation: string[] }>(createPost.error);
  expectType<string[]>(createPost.error.validation);

  // @ts-expect-error - message is DefaultError, not posts POST error
  createPost.error.message;
}

if (updatePost.error) {
  expectType<{ notFound: boolean }>(updatePost.error);
  expectType<boolean>(updatePost.error.notFound);

  // @ts-expect-error - validation is posts POST error, not posts/:id PUT error
  updatePost.error.validation;
}

if (deletePost.error) {
  expectType<{ notFound: boolean }>(deletePost.error);
  expectType<boolean>(deletePost.error.notFound);

  // @ts-expect-error - message is DefaultError, not posts/:id DELETE error
  deletePost.error.message;
}

// =============================================================================
// Error inference - default error fallback
// =============================================================================

const usersWrite = useWrite((api) => api("users").POST());
if (usersWrite.error) {
  expectType<{ message: string }>(usersWrite.error);
  expectType<string>(usersWrite.error.message);

  // @ts-expect-error - validation is posts POST error, not default error
  usersWrite.error.validation;
}

// =============================================================================
// Loading states
// =============================================================================

expectType<boolean>(createPost.loading);

// =============================================================================
// Meta field
// =============================================================================

createPost.meta;

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
