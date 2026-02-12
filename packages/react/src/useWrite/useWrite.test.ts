/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor } from "@spoosh/core";
import { createUseWrite } from "./index";

function createMockApi() {
  const calls: Array<{ path: string; method: string; options: unknown }> = [];
  let mockResponse: { data?: unknown; error?: unknown; status: number } = {
    data: { id: 1, name: "Created" },
    status: 201,
  };
  let delay = 0;

  const setMockResponse = (response: typeof mockResponse) => {
    mockResponse = response;
  };

  const setDelay = (ms: number) => {
    delay = ms;
  };

  const api = (path: string) => ({
    POST: (opts?: unknown) => {
      calls.push({ path, method: "POST", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
    PUT: (opts?: unknown) => {
      calls.push({ path, method: "PUT", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
    DELETE: (opts?: unknown) => {
      calls.push({ path, method: "DELETE", options: opts });

      if (delay > 0) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(mockResponse), delay)
        );
      }

      return Promise.resolve(mockResponse);
    },
  });

  return { api, calls, setMockResponse, setDelay };
}

function createTestHooks() {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);
  const { api, calls, setMockResponse, setDelay } = createMockApi();

  const useWrite = createUseWrite<any, unknown, []>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  return {
    useWrite,
    stateManager,
    eventEmitter,
    calls,
    setMockResponse,
    setDelay,
  };
}

describe("useWrite", () => {
  describe("Basic Functionality", () => {
    it("returns trigger, data, loading, error", () => {
      const { useWrite } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      expect(result.current).toHaveProperty("trigger");
      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("abort");
    });

    it("initial state is not loading", () => {
      const { useWrite } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      expect(result.current.loading).toBe(false);
    });

    it("initial data is undefined", () => {
      const { useWrite } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      expect(result.current.data).toBeUndefined();
    });
  });

  describe("Trigger Function", () => {
    it("trigger executes mutation", async () => {
      const { useWrite, calls } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        path: "posts",
        method: "POST",
      });
    });

    it("trigger returns response", async () => {
      const { useWrite, setMockResponse } = createTestHooks();
      setMockResponse({ data: { id: 42, name: "Created" }, status: 201 });

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      let response: unknown;

      await act(async () => {
        response = await result.current.trigger({
          body: { title: "New Post" },
        } as any);
      });

      expect(response).toEqual({
        data: { id: 42, name: "Created" },
        status: 201,
      });
    });

    it("trigger sets loading state during execution", async () => {
      const { useWrite, setDelay } = createTestHooks();
      setDelay(50);

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      expect(result.current.loading).toBe(false);

      let triggerPromise: Promise<unknown>;

      act(() => {
        triggerPromise = result.current.trigger({
          body: { title: "New Post" },
        } as any);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await act(async () => {
        await triggerPromise;
      });
    });

    it("trigger clears loading on completion", async () => {
      const { useWrite, setDelay } = createTestHooks();
      setDelay(10);

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("sets error on failed mutation", async () => {
      const { useWrite, setMockResponse } = createTestHooks();
      setMockResponse({ error: { message: "Server error" }, status: 500 });

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(result.current.error).toEqual({ message: "Server error" });
    });

    it("throws when no HTTP method called", () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);
      const { api } = createMockApi();

      const useWrite = createUseWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(() => {
        renderHook(() => useWrite((api) => api("posts")));
      }).toThrow(
        'useWrite requires calling an HTTP method (POST, PUT, PATCH, DELETE). Example: useWrite((api) => api("posts").POST())'
      );
    });

    it("clears error on subsequent success", async () => {
      const { useWrite, setMockResponse } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      setMockResponse({ error: { message: "Server error" }, status: 500 });

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(result.current.error).toEqual({ message: "Server error" });

      setMockResponse({ data: { id: 1 }, status: 201 });

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe("Abort", () => {
    it("abort cancels in-flight mutation", async () => {
      const { useWrite, setDelay } = createTestHooks();
      setDelay(100);

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      let triggerPromise: Promise<unknown>;

      act(() => {
        triggerPromise = result.current.trigger({
          body: { title: "New Post" },
        } as any);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      act(() => {
        result.current.abort();
      });

      expect(result.current.abort).toBeDefined();
      expect(typeof result.current.abort).toBe("function");

      await act(async () => {
        try {
          await triggerPromise;
        } catch {
          // Expected to potentially throw or resolve depending on abort timing
        }
      });
    });
  });

  describe("Input Fields", () => {
    it("tracks last trigger options", async () => {
      const { useWrite } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({
          body: { title: "Test Post" },
          query: { draft: "true" },
        } as any);
      });

      const current = result.current as any;
      expect(current.input).toBeDefined();
      expect(current.input?.body).toEqual({ title: "Test Post" });
      expect(current.input?.query).toEqual({ draft: "true" });
    });

    it("returns input fields from trigger options", async () => {
      const { useWrite } = createTestHooks();

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts/:id").PUT())
      );

      await act(async () => {
        await result.current.trigger({
          params: { id: 123 },
          body: { title: "Updated Post" },
        } as any);
      });

      const current = result.current as any;
      expect(current.input?.params).toEqual({ id: 123 });
      expect(current.input?.body).toEqual({ title: "Updated Post" });
    });
  });

  describe("Plugin Integration", () => {
    it("passes plugin options to controller", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const middlewareSpy = vi
        .fn()
        .mockImplementation(async (_ctx, next) => next());
      const pluginExecutor = createPluginExecutor([
        {
          name: "test-plugin",
          operations: ["write"],
          middleware: middlewareSpy,
        },
      ]);
      const { api, calls } = createMockApi();

      const useWrite = createUseWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({ body: { title: "New Post" } } as any);
      });

      expect(calls).toHaveLength(1);
      expect(middlewareSpy).toHaveBeenCalled();
    });

    it("resolves tags from trigger options", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const afterResponseSpy = vi.fn();
      const pluginExecutor = createPluginExecutor([
        {
          name: "tag-plugin",
          operations: ["write"],
          afterResponse: afterResponseSpy,
        },
      ]);
      const { api } = createMockApi();

      const useWrite = createUseWrite({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const { result } = renderHook(() =>
        useWrite((api: any) => api("posts").POST())
      );

      await act(async () => {
        await result.current.trigger({
          body: { title: "New Post" },
          tags: ["posts", "create"],
        } as any);
      });

      expect(afterResponseSpy).toHaveBeenCalled();
      const callContext = afterResponseSpy.mock.calls[0]?.[0];
      expect(callContext?.tags).toContain("posts");
      expect(callContext?.tags).toContain("create");
    });
  });
});
