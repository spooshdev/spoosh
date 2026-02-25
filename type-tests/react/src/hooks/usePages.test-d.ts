/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expectType } from "tsd";
import { Spoosh, InfinitePage, InfinitePageStatus } from "@spoosh/core";
import { create } from "@spoosh/react";
import { cachePlugin } from "@spoosh/plugin-cache";
import type { TestSchema, DefaultError } from "../schema.js";

const spoosh = new Spoosh<TestSchema, DefaultError>("/api").use([
  cachePlugin(),
]);
const { usePages } = create(spoosh);

// =============================================================================
// Hook Options
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  merger: () => [],
  // @ts-expect-error - should not allow unknown options
  invalidOption: "test",
});

// =============================================================================
// Basic usage with merger
// =============================================================================

const activities = usePages((api) => api("activities").GET({ query: {} }), {
  canFetchNext: ({ lastPage }) => lastPage?.data?.nextCursor !== null,
  nextPageRequest: ({ lastPage }) => ({
    query: { cursor: lastPage?.data?.nextCursor ?? undefined },
  }),
  merger: (pages) => pages.flatMap((p) => p.data?.items ?? []),
});

expectType<{ id: number; message: string }[] | undefined>(activities.data);

// =============================================================================
// Pages array
// =============================================================================

activities.pages;

// =============================================================================
// Error inference
// =============================================================================

if (activities.error) {
  expectType<{ paginationError: number }>(activities.error);
  expectType<number>(activities.error.paginationError);

  // @ts-expect-error - message is DefaultError, not activities error
  activities.error.message;
}

// =============================================================================
// Loading states
// =============================================================================

expectType<boolean>(activities.loading);
expectType<boolean>(activities.fetching);
expectType<boolean>(activities.fetchingNext);
expectType<boolean>(activities.fetchingPrev);

// =============================================================================
// Pagination states
// =============================================================================

expectType<boolean>(activities.canFetchNext);
expectType<boolean>(activities.canFetchPrev);

// =============================================================================
// Fetch next function
// =============================================================================

activities.fetchNext();
const fetchNextResult = activities.fetchNext();
expectType<Promise<void>>(fetchNextResult);

// =============================================================================
// Fetch prev function
// =============================================================================

activities.fetchPrev();
const fetchPrevResult = activities.fetchPrev();
expectType<Promise<void>>(fetchPrevResult);

// =============================================================================
// Trigger function
// =============================================================================

activities.trigger();
const triggerResult = activities.trigger();
expectType<Promise<void>>(triggerResult);

// =============================================================================
// Abort function
// =============================================================================

activities.abort();

// =============================================================================
// canFetchNext callback type inference
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  canFetchNext: ({ lastPage }) => {
    expectType<
      | {
          items: { id: number; message: string }[];
          nextCursor: number | null;
        }
      | undefined
    >(lastPage?.data);
    return lastPage?.data?.nextCursor !== null;
  },
  merger: () => [],
});

// =============================================================================
// Merger callback type inference
// =============================================================================

type ActivityData = {
  items: { id: number; message: string }[];
  nextCursor: number | null;
};

usePages((api) => api("activities").GET({ query: {} }), {
  merger: (pages) => {
    // Assert pages parameter type (meta is object, not Record<string, unknown>)
    expectType<
      InfinitePage<ActivityData, { paginationError: number }, object>[]
    >(pages);

    const page = pages[0];
    if (page) {
      // Assert page status is InfinitePageStatus
      expectType<InfinitePageStatus>(page.status);

      // Assert page data type
      if (page.data) {
        expectType<ActivityData>(page.data);
        expectType<{ id: number; message: string }[]>(page.data.items);
      }

      // Assert page error type
      if (page.error) {
        expectType<{ paginationError: number }>(page.error);
      }
    }

    return pages.flatMap((p) => p.data?.items ?? []);
  },
});

// =============================================================================
// nextPageRequest callback type inference
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  nextPageRequest: ({ lastPage }) => ({
    query: { cursor: lastPage?.data?.nextCursor ?? undefined },
  }),
  merger: () => [],
});

// =============================================================================
// Simple merger
// =============================================================================

usePages((api) => api("activities").GET({ query: {} }), {
  merger: () => [],
});

// =============================================================================
// Query params
// =============================================================================

usePages((api) => api("activities").GET({ query: { limit: 10 } }), {
  merger: () => [],
});

usePages((api) => api("activities").GET({ query: { cursor: 1, limit: 20 } }), {
  merger: () => [],
});

usePages((api) => api("activities").GET({ query: {} }), {
  // @ts-expect-error - merger must return correct item type (array of items, not string)
  merger: () => "invalid",
});
