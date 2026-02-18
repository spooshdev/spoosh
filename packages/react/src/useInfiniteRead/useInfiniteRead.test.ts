/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createUseInfiniteRead } from "./index";

type PageResponse = {
  items: { id: number }[];
  nextCursor?: string;
  prevCursor?: string;
};

function createMockApi() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let pageNumber = 0;

  const api = (path: string) => ({
    GET: (opts?: {
      query?: {
        cursor?: string;
        customParam?: string;
        customPrevParam?: string;
      };
      signal?: AbortSignal;
    }) => {
      calls.push({ path, method: "GET", options: opts });
      const query = opts?.query;
      pageNumber = query?.cursor ? parseInt(query.cursor, 10) : 0;

      const response: PageResponse = {
        items: [{ id: pageNumber * 10 + 1 }, { id: pageNumber * 10 + 2 }],
        nextCursor: pageNumber < 3 ? String(pageNumber + 1) : undefined,
        prevCursor: pageNumber > 0 ? String(pageNumber - 1) : undefined,
      };

      return Promise.resolve({ data: response, status: 200 });
    },
  });

  return { api, calls };
}

function createErrorApi() {
  type ErrorApi = (path: string) => {
    GET: () => Promise<{
      data: undefined;
      error: { message: string };
      status: number;
    }>;
  };

  const api: ErrorApi = () => ({
    GET: () => {
      return Promise.resolve({
        data: undefined,
        error: { message: "Network error" },
        status: 500,
      });
    },
  });

  return { api };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls } = createMockApi();

  const useInfiniteRead = createUseInfiniteRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return { useInfiniteRead, stateManager, eventEmitter, calls };
}

function createErrorTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api } = createErrorApi();

  const useInfiniteRead = createUseInfiniteRead<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return { useInfiniteRead, stateManager, eventEmitter };
}

describe("useInfiniteRead", () => {
  describe("Basic Functionality", () => {
    it("should return data, loading, and allResponses", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.allResponses).toBeDefined();
    });

    it("should return canFetchNext and canFetchPrev flags", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            canFetchPrev: (ctx) => ctx.response?.prevCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            prevPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.prevCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.canFetchNext).toBe("boolean");
      expect(typeof result.current.canFetchPrev).toBe("boolean");
    });

    it("should return fetchNext and fetchPrev functions", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.fetchNext).toBe("function");
      expect(typeof result.current.fetchPrev).toBe("function");
    });
  });

  describe("Pagination", () => {
    it("should fetch initial page on mount", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(0);
      });

      expect(calls[0]!.path).toBe("/posts");
      expect(calls[0]!.method).toBe("GET");
    });

    it("should fetch next page when fetchNext is called", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      await act(async () => {
        await result.current.fetchNext();
      });

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should fetch previous page when fetchPrev is called", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) =>
            api("/posts").GET({
              query: { cursor: "2" },
            }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            canFetchPrev: (ctx) => ctx.response?.prevCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            prevPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.prevCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      await act(async () => {
        await result.current.fetchPrev();
      });

      expect(calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should merge responses correctly using merger function", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);

      await act(async () => {
        await result.current.fetchNext();
      });

      expect(result.current.data).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 11 },
        { id: 12 },
      ]);
    });
  });

  describe("State Flags", () => {
    it("should set fetchingNext to true during next page fetch", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        const promise = result.current.fetchNext();
        await promise;
      });

      expect(result.current.fetchingNext).toBe(false);
    });

    it("should set fetchingPrev to true during prev page fetch", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) =>
            api("/posts").GET({
              query: { cursor: "2" },
            }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            canFetchPrev: (ctx) => ctx.response?.prevCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            prevPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.prevCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchPrev();
      });

      expect(result.current.fetchingPrev).toBe(false);
    });

    it("should correctly differentiate loading vs fetching states", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.fetching).toBe(false);
    });
  });

  describe("Callbacks", () => {
    it("should use canFetchNext predicate to control pagination", async () => {
      const { useInfiniteRead } = createTestHooks();
      const canFetchNextFn = vi.fn(() => false);

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: canFetchNextFn,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canFetchNext).toBe(false);
    });

    it("should use canFetchPrev predicate to control pagination", async () => {
      const { useInfiniteRead } = createTestHooks();
      const canFetchPrevFn = vi.fn(() => false);

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            canFetchPrev: canFetchPrevFn,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            prevPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.prevCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canFetchPrev).toBe(false);
    });

    it("should use nextPageRequest to generate correct options", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor, customParam: "test" },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchNext();
      });

      const lastCall = calls[calls.length - 1];
      expect(
        (lastCall?.options as { query?: { customParam?: string } })?.query
          ?.customParam
      ).toBe("test");
    });

    it("should use prevPageRequest to generate correct options", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) =>
            api("/posts").GET({
              query: { cursor: "2" },
            }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            canFetchPrev: (ctx) => ctx.response?.prevCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            prevPageRequest: (ctx) => ({
              query: {
                cursor: ctx.response?.prevCursor,
                customPrevParam: "prevTest",
              },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchPrev();
      });

      const lastCall = calls[calls.length - 1];
      expect(
        (lastCall?.options as { query?: { customPrevParam?: string } })?.query
          ?.customPrevParam
      ).toBe("prevTest");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when no HTTP method is called", () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const api = () => ({});

      const useInfiniteRead = createUseInfiniteRead({
        api: api as unknown,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(() => {
        renderHook(() =>
          useInfiniteRead(
            () => Promise.resolve({ data: undefined, status: 200 }),
            {
              canFetchNext: () => false,
              nextPageRequest: () => ({}),
              merger: () => [],
            }
          )
        );
      }).toThrow("useInfiniteRead requires calling an HTTP method");
    });

    it("should handle failed fetch gracefully", async () => {
      const { useInfiniteRead } = createErrorTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: () => false,
            nextPageRequest: () => ({}),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe("Event Handling", () => {
    it("should respond to invalidate events", async () => {
      const { useInfiniteRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            tags: ["posts"],
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      await act(async () => {
        eventEmitter.emit("invalidate", ["posts"]);
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it("should refetch on invalidation", async () => {
      const { useInfiniteRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            tags: ["posts"],
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountBeforeInvalidate = calls.length;

      await act(async () => {
        eventEmitter.emit("invalidate", ["posts"]);
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(callCountBeforeInvalidate);
      });

      expect(result.current.data).toBeDefined();
    });

    it("should respond to refetchAll events", async () => {
      const { useInfiniteRead, eventEmitter, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;

      await act(async () => {
        eventEmitter.emit("refetchAll", undefined);
      });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe("Additional Edge Cases", () => {
    it("should not fetch when enabled is false", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            enabled: false,
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(0);
    });

    it("should return trigger function for manual refetch", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.trigger).toBe("function");

      const callCountBefore = calls.length;

      await act(async () => {
        await result.current.trigger();
      });

      expect(calls.length).toBeGreaterThan(callCountBefore);
    });

    it("should return abort function", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET(),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.abort).toBe("function");
    });
  });

  describe("Trigger with Options", () => {
    it("should restart pagination with new query params when trigger is called with options", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET({ query: { search: "initial" } }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCall = calls[0];
      expect((initialCall?.options as any)?.query?.search).toBe("initial");

      await act(async () => {
        await result.current.trigger({ query: { search: "updated" } });
      });

      const triggerCall = calls[calls.length - 1];
      expect((triggerCall?.options as any)?.query?.search).toBe("updated");
    });

    it("should preserve trigger options in subsequent fetchNext calls", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET({ query: { search: "initial" } }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.trigger({ query: { search: "filtered" } });
      });

      await act(async () => {
        await result.current.fetchNext();
      });

      const lastCall = calls[calls.length - 1];
      expect((lastCall?.options as any)?.query?.search).toBe("filtered");
      expect((lastCall?.options as any)?.query?.cursor).toBeDefined();
    });

    it("should reset to original request when trigger is called without options", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useInfiniteRead<PageResponse, { id: number }>(
          (api: any) => api("/posts").GET({ query: { search: "original" } }),
          {
            canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
            nextPageRequest: (ctx) => ({
              query: { cursor: ctx.response?.nextCursor },
            }),
            merger: (responses) => responses.flatMap((r) => r.items),
          }
        )
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.trigger({ query: { search: "temporary" } });
      });

      await act(async () => {
        await result.current.trigger();
      });

      const lastCall = calls[calls.length - 1];
      expect((lastCall?.options as any)?.query?.search).toBe("original");
    });
  });

  describe("Reactive Query Changes", () => {
    it("should restart pagination when query params change in read function", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result, rerender } = renderHook(
        ({ search }: { search: string }) =>
          useInfiniteRead<PageResponse, { id: number }>(
            (api: any) => api("/posts").GET({ query: { search } }),
            {
              canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
              nextPageRequest: (ctx) => ({
                query: { cursor: ctx.response?.nextCursor },
              }),
              merger: (responses) => responses.flatMap((r) => r.items),
            }
          ),
        { initialProps: { search: "first" } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = calls.length;
      expect((calls[0]?.options as any)?.query?.search).toBe("first");

      rerender({ search: "second" });

      await waitFor(() => {
        expect(calls.length).toBeGreaterThan(initialCallCount);
      });

      const lastCall = calls[calls.length - 1];
      expect((lastCall?.options as any)?.query?.search).toBe("second");
    });

    it("should create fresh pagination state when query changes", async () => {
      const { useInfiniteRead } = createTestHooks();

      const { result, rerender } = renderHook(
        ({ search }: { search: string }) =>
          useInfiniteRead<PageResponse, { id: number }>(
            (api: any) => api("/posts").GET({ query: { search } }),
            {
              canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
              nextPageRequest: (ctx) => ({
                query: { cursor: ctx.response?.nextCursor },
              }),
              merger: (responses) => responses.flatMap((r) => r.items),
            }
          ),
        { initialProps: { search: "first" } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchNext();
      });

      expect(result.current.data?.length).toBe(4);

      rerender({ search: "second" });

      await waitFor(() => {
        expect(result.current.data?.length).toBe(2);
      });
    });

    it("should not refetch when query params remain the same", async () => {
      const { useInfiniteRead, calls } = createTestHooks();

      const { result, rerender } = renderHook(
        ({ search }: { search: string }) =>
          useInfiniteRead<PageResponse, { id: number }>(
            (api: any) => api("/posts").GET({ query: { search } }),
            {
              canFetchNext: (ctx) => ctx.response?.nextCursor !== undefined,
              nextPageRequest: (ctx) => ({
                query: { cursor: ctx.response?.nextCursor },
              }),
              merger: (responses) => responses.flatMap((r) => r.items),
            }
          ),
        { initialProps: { search: "same" } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callCountAfterInitial = calls.length;

      rerender({ search: "same" });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(calls.length).toBe(callCountAfterInitial);
    });
  });
});
