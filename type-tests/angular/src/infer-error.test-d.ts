/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "./schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { injectRead, injectWrite, injectPages, injectQueue } = create(spoosh);

// =============================================================================
// injectRead - Per-endpoint error inference
// =============================================================================

const postsRead = injectRead((api) => api("posts").GET());
const postsError = postsRead.error();
if (postsError) {
  expectType<{ customError: string }>(postsError);
  expectType<string>(postsError.customError);

  // @ts-expect-error - message is DefaultError, not posts error
  postsError.message;
  // @ts-expect-error - notFound is posts/:id error, not posts error
  postsError.notFound;
}

const postByIdRead = injectRead((api) =>
  api("posts/:id").GET({ params: { id: "1" } })
);
const postByIdError = postByIdRead.error();
if (postByIdError) {
  expectType<{ notFound: boolean }>(postByIdError);
  expectType<boolean>(postByIdError.notFound);

  // @ts-expect-error - customError is posts error, not posts/:id error
  postByIdError.customError;
  // @ts-expect-error - message is DefaultError, not posts/:id error
  postByIdError.message;
}

// Default error fallback when endpoint has no error defined
const usersRead = injectRead((api) => api("users").GET());
const usersError = usersRead.error();
if (usersError) {
  expectType<{ message: string }>(usersError);
  expectType<string>(usersError.message);

  // @ts-expect-error - customError is posts error, not default error
  usersError.customError;
  // @ts-expect-error - notFound is posts/:id error, not default error
  usersError.notFound;
}

// =============================================================================
// injectWrite - Per-endpoint error inference
// =============================================================================

const postsWrite = injectWrite((api) => api("posts").POST());
const postsWriteError = postsWrite.error();
if (postsWriteError) {
  expectType<{ validation: string[] }>(postsWriteError);
  expectType<string[]>(postsWriteError.validation);

  // @ts-expect-error - message is DefaultError, not posts POST error
  postsWriteError.message;
  // @ts-expect-error - notFound is posts/:id error, not posts POST error
  postsWriteError.notFound;
}

const postUpdateWrite = injectWrite((api) => api("posts/:id").PUT());
const postUpdateError = postUpdateWrite.error();
if (postUpdateError) {
  expectType<{ notFound: boolean }>(postUpdateError);
  expectType<boolean>(postUpdateError.notFound);

  // @ts-expect-error - validation is posts POST error, not posts/:id PUT error
  postUpdateError.validation;
  // @ts-expect-error - message is DefaultError, not posts/:id PUT error
  postUpdateError.message;
}

const postDeleteWrite = injectWrite((api) => api("posts/:id").DELETE());
const postDeleteError = postDeleteWrite.error();
if (postDeleteError) {
  expectType<{ notFound: boolean }>(postDeleteError);
  expectType<boolean>(postDeleteError.notFound);

  // @ts-expect-error - message is DefaultError, not posts/:id DELETE error
  postDeleteError.message;
}

// Default error fallback when endpoint has no error defined
const usersWrite = injectWrite((api) => api("users").POST());
const usersWriteError = usersWrite.error();
if (usersWriteError) {
  expectType<{ message: string }>(usersWriteError);
  expectType<string>(usersWriteError.message);

  // @ts-expect-error - validation is posts POST error, not default error
  usersWriteError.validation;
  // @ts-expect-error - notFound is posts/:id error, not default error
  usersWriteError.notFound;
}

// =============================================================================
// injectPages - Per-endpoint error inference
// =============================================================================

const activitiesPages = injectPages(
  (api) => api("activities").GET({ query: {} }),
  {
    canFetchNext: ({ lastPage }) => lastPage?.data?.nextCursor !== null,
    nextPageRequest: ({ lastPage }) => ({
      query: { cursor: lastPage?.data?.nextCursor ?? undefined },
    }),
    merger: (pages) => pages.flatMap((p) => p.data?.items ?? []),
  }
);
const activitiesError = activitiesPages.error();
if (activitiesError) {
  expectType<{ paginationError: number }>(activitiesError);
  expectType<number>(activitiesError.paginationError);

  // @ts-expect-error - message is DefaultError, not activities error
  activitiesError.message;
  // @ts-expect-error - notFound is posts/:id error, not activities error
  activitiesError.notFound;
}

// =============================================================================
// injectQueue - Per-endpoint error inference
// =============================================================================

const uploadsQueue = injectQueue((api) => api("uploads").POST());
const queueTasks = uploadsQueue.tasks();
const queueTask = queueTasks[0];
if (queueTask?.error) {
  expectType<{ uploadFailed: string }>(queueTask.error);
  expectType<string>(queueTask.error.uploadFailed);

  // @ts-expect-error - message is DefaultError, not uploads error
  queueTask.error.message;
  // @ts-expect-error - notFound is posts/:id error, not uploads error
  queueTask.error.notFound;
}
