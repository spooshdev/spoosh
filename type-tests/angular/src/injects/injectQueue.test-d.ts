/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import {
  Spoosh,
  SpooshResponse,
  QueueStats,
  QueueItemStatus,
} from "@spoosh/core";
import { create } from "@spoosh/angular";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { injectQueue } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

injectQueue((api) => api("uploads").POST(), {
  // @ts-expect-error - should not allow unknown options
  invalidOption: "test",
});

// =============================================================================
// Basic usage
// =============================================================================

const uploadQueue = injectQueue((api) => api("uploads").POST());

// =============================================================================
// Tasks array (signal)
// =============================================================================

const tasks = uploadQueue.tasks();
const task = tasks[0];

// =============================================================================
// Task status type
// =============================================================================

if (task) {
  expectType<QueueItemStatus>(task.status);
  expectType<string>(task.id);
}

// =============================================================================
// Task data inference
// =============================================================================

if (task?.data) {
  expectType<{ url: string }>(task.data);
  expectType<string>(task.data.url);
}

// =============================================================================
// Task error inference
// =============================================================================

if (task?.error) {
  expectType<{ uploadFailed: string }>(task.error);
  expectType<string>(task.error.uploadFailed);

  // @ts-expect-error - message is DefaultError, not uploads error
  task.error.message;
}

// =============================================================================
// Queue stats (signal)
// =============================================================================

const stats = uploadQueue.stats();
expectType<QueueStats>(stats);
expectType<number>(stats.pending);
expectType<number>(stats.running);
expectType<number>(stats.settled);
expectType<number>(stats.success);
expectType<number>(stats.failed);
expectType<number>(stats.total);
expectType<number>(stats.percentage);

// =============================================================================
// Trigger function - body required
// =============================================================================

uploadQueue.trigger({ body: new FormData() });

// @ts-expect-error - body is required
uploadQueue.trigger({});

// =============================================================================
// Trigger with custom ID
// =============================================================================

uploadQueue.trigger({ id: "custom-id", body: new FormData() });

// =============================================================================
// Trigger return type
// =============================================================================

const triggerResult = uploadQueue.trigger({ body: new FormData() });
expectType<Promise<SpooshResponse<{ url: string }, { uploadFailed: string }>>>(
  triggerResult
);

// =============================================================================
// Abort function
// =============================================================================

uploadQueue.abort();
uploadQueue.abort("task-id");

// =============================================================================
// Retry function
// =============================================================================

uploadQueue.retry();
uploadQueue.retry("task-id");
const retryResult = uploadQueue.retry("task-id");
expectType<Promise<void>>(retryResult);

// =============================================================================
// Remove function
// =============================================================================

uploadQueue.remove("task-id");

// =============================================================================
// Remove settled function
// =============================================================================

uploadQueue.removeSettled();

// =============================================================================
// Clear function
// =============================================================================

uploadQueue.clear();
