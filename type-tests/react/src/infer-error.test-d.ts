/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import { sse } from "@spoosh/transport-sse";
import type { TestSchema, DefaultError } from "./schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api")
  .use([cachePlugin()])
  .withTransports([sse()]);
const { useRead, useWrite, usePages, useQueue, useSSE } = create(spoosh);

// =============================================================================
// useRead - Per-endpoint error inference
// =============================================================================

const postsRead = useRead((api) => api("posts").GET());
if (postsRead.error) {
  // Exact shape prevents widening to any
  expectType<{ customError: string }>(postsRead.error);

  // Property access verifies narrowing works
  expectType<string>(postsRead.error.customError);

  // Structural guarantee - other error types don't exist
  // @ts-expect-error - message is DefaultError, not posts error
  postsRead.error.message;
  // @ts-expect-error - notFound is posts/:id error, not posts error
  postsRead.error.notFound;
}

const postByIdRead = useRead((api) =>
  api("posts/:id").GET({ params: { id: "1" } })
);
if (postByIdRead.error) {
  expectType<{ notFound: boolean }>(postByIdRead.error);
  expectType<boolean>(postByIdRead.error.notFound);

  // @ts-expect-error - customError is posts error, not posts/:id error
  postByIdRead.error.customError;
  // @ts-expect-error - message is DefaultError, not posts/:id error
  postByIdRead.error.message;
}

// Default error fallback when endpoint has no error defined
const usersRead = useRead((api) => api("users").GET());
if (usersRead.error) {
  expectType<{ message: string }>(usersRead.error);
  expectType<string>(usersRead.error.message);

  // @ts-expect-error - customError is posts error, not default error
  usersRead.error.customError;
  // @ts-expect-error - notFound is posts/:id error, not default error
  usersRead.error.notFound;
}

// =============================================================================
// useWrite - Per-endpoint error inference
// =============================================================================

const postsWrite = useWrite((api) => api("posts").POST());
if (postsWrite.error) {
  expectType<{ validation: string[] }>(postsWrite.error);
  expectType<string[]>(postsWrite.error.validation);

  // @ts-expect-error - message is DefaultError, not posts POST error
  postsWrite.error.message;
  // @ts-expect-error - notFound is posts/:id error, not posts POST error
  postsWrite.error.notFound;
}

const postUpdateWrite = useWrite((api) => api("posts/:id").PUT());
if (postUpdateWrite.error) {
  expectType<{ notFound: boolean }>(postUpdateWrite.error);
  expectType<boolean>(postUpdateWrite.error.notFound);

  // @ts-expect-error - validation is posts POST error, not posts/:id PUT error
  postUpdateWrite.error.validation;
  // @ts-expect-error - message is DefaultError, not posts/:id PUT error
  postUpdateWrite.error.message;
}

const postDeleteWrite = useWrite((api) => api("posts/:id").DELETE());
if (postDeleteWrite.error) {
  expectType<{ notFound: boolean }>(postDeleteWrite.error);
  expectType<boolean>(postDeleteWrite.error.notFound);

  // @ts-expect-error - message is DefaultError, not posts/:id DELETE error
  postDeleteWrite.error.message;
}

// Default error fallback when endpoint has no error defined
const usersWrite = useWrite((api) => api("users").POST());
if (usersWrite.error) {
  expectType<{ message: string }>(usersWrite.error);
  expectType<string>(usersWrite.error.message);

  // @ts-expect-error - validation is posts POST error, not default error
  usersWrite.error.validation;
  // @ts-expect-error - notFound is posts/:id error, not default error
  usersWrite.error.notFound;
}

// =============================================================================
// usePages - Per-endpoint error inference
// =============================================================================

const activitiesPages = usePages(
  (api) => api("activities").GET({ query: {} }),
  {
    canFetchNext: ({ lastPage }) => lastPage?.data?.nextCursor !== null,
    nextPageRequest: ({ lastPage }) => ({
      query: { cursor: lastPage?.data?.nextCursor ?? undefined },
    }),
    merger: (pages) => pages.flatMap((p) => p.data?.items ?? []),
  }
);
if (activitiesPages.error) {
  expectType<{ paginationError: number }>(activitiesPages.error);
  expectType<number>(activitiesPages.error.paginationError);

  // @ts-expect-error - message is DefaultError, not activities error
  activitiesPages.error.message;
  // @ts-expect-error - notFound is posts/:id error, not activities error
  activitiesPages.error.notFound;
}

// =============================================================================
// useQueue - Per-endpoint error inference
// =============================================================================

const uploadsQueue = useQueue((api) => api("uploads").POST());
const queueTask = uploadsQueue.tasks[0];
if (queueTask?.error) {
  expectType<{ uploadFailed: string }>(queueTask.error);
  expectType<string>(queueTask.error.uploadFailed);

  // @ts-expect-error - message is DefaultError, not uploads error
  queueTask.error.message;
  // @ts-expect-error - notFound is posts/:id error, not uploads error
  queueTask.error.notFound;
}

// =============================================================================
// useSSE - Per-endpoint error inference
// =============================================================================

const notificationsSSE = useSSE((api) => api("notifications").GET());
if (notificationsSSE.error) {
  expectType<{ connectionError: boolean }>(notificationsSSE.error);
  expectType<boolean>(notificationsSSE.error.connectionError);

  // @ts-expect-error - message is DefaultError, not notifications error
  notificationsSSE.error.message;
  // @ts-expect-error - notFound is posts/:id error, not notifications error
  notificationsSSE.error.notFound;
}

// Default error fallback when endpoint has no error defined
const eventsSSE = useSSE((api) => api("events/stream").GET());
if (eventsSSE.error) {
  expectType<{ message: string }>(eventsSSE.error);
  expectType<string>(eventsSSE.error.message);

  // @ts-expect-error - connectionError is notifications error, not default error
  eventsSSE.error.connectionError;
  // @ts-expect-error - notFound is posts/:id error, not default error
  eventsSSE.error.notFound;
}
