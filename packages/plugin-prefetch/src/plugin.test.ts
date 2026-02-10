import { type PluginExecutor, type SpooshResponse } from "@spoosh/core";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";

import { prefetchPlugin } from "./plugin";

type MockGetFn = ReturnType<typeof vi.fn> &
  ((...args: unknown[]) => Promise<SpooshResponse<unknown, unknown>>);

type MockMethods = {
  GET: MockGetFn;
};

type MockApi = ((path: string) => MockMethods) & {
  _mocks: Record<string, MockMethods>;
};

function createMockApi(): MockApi {
  const mocks: Record<string, MockMethods> = {
    posts: {
      GET: vi
        .fn()
        .mockResolvedValue({ data: { posts: [] }, status: 200 }) as MockGetFn,
    },
    users: {
      GET: vi
        .fn()
        .mockResolvedValue({ data: { users: [] }, status: 200 }) as MockGetFn,
    },
    "users/:id": {
      GET: vi.fn().mockResolvedValue({
        data: { id: 1, name: "User" },
        status: 200,
      }) as MockGetFn,
    },
  };

  const api = ((path: string): MockMethods => {
    if (!mocks[path]) {
      mocks[path] = {
        GET: vi
          .fn()
          .mockResolvedValue({ data: null, status: 200 }) as MockGetFn,
      };
    }

    return mocks[path];
  }) as MockApi;

  api._mocks = mocks;

  return api;
}

function createMockPluginExecutor(
  middleware?: (
    context: unknown,
    next: () => Promise<SpooshResponse<unknown, unknown>>
  ) => Promise<SpooshResponse<unknown, unknown>>
): PluginExecutor {
  return {
    executeLifecycle: vi.fn().mockResolvedValue(undefined),
    executeUpdateLifecycle: vi.fn().mockResolvedValue(undefined),
    executeMiddleware: vi.fn().mockImplementation((_type, _ctx, coreFetch) => {
      if (middleware) {
        return middleware(_ctx, coreFetch);
      }

      return coreFetch();
    }),
    getPlugins: vi.fn().mockReturnValue([]),
    registerContextEnhancer: vi.fn(),
    createContext: vi.fn().mockImplementation((input) => ({
      ...input,
      headers: {},
      setHeaders: vi.fn(),
      plugins: { get: vi.fn() },
    })),
  };
}

describe("prefetchPlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = prefetchPlugin();
      expect(plugin.name).toBe("spoosh:prefetch");
    });

    it("should have empty operations array", () => {
      const plugin = prefetchPlugin();
      expect(plugin.operations).toEqual([]);
    });
  });

  describe("instanceApi", () => {
    it("should return prefetch function", () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const instanceApi = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      expect(instanceApi.prefetch).toBeDefined();
      expect(typeof instanceApi.prefetch).toBe("function");
    });
  });

  describe("prefetch function", () => {
    it("should execute fetch and store data in cache", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      api("posts").GET.mockResolvedValue({
        data: { posts: [{ id: 1 }] },
        status: 200,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.state.data).toEqual({ posts: [{ id: 1 }] });
    });

    it("should return error but not cache error data when fetch fails", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const errorResponse = { message: "Not found" };
      api("posts").GET.mockResolvedValue({
        error: errorResponse,
        status: 404,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(result.error).toEqual(errorResponse);

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.state.data).toBeUndefined();
      expect(cached?.state.error).toBeUndefined();
    });

    it("should throw error when selector does not select a GET method", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await expect(
        prefetch((apiProxy) => {
          void (apiProxy as unknown as MockApi)("posts");
          return Promise.resolve({ data: undefined, status: 200 });
        })
      ).rejects.toThrow("prefetch requires selecting a GET method");
    });

    it("should pass options to the API call", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET({
          query: { page: 1, limit: 10 },
        })
      );

      expect(api("posts").GET).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { page: 1, limit: 10 },
        })
      );
    });

    it("should resolve nested paths correctly", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      api("users/:id").GET.mockResolvedValue({
        data: { id: 1, name: "John" },
        status: 200,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("users/:id").GET({
          params: { id: "1" },
        })
      );

      expect(api("users/:id").GET).toHaveBeenCalled();

      const queryKey = stateManager.createQueryKey({
        path: "users/:id",
        method: "GET",
        options: { params: { id: "1" } },
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.state.data).toEqual({ id: 1, name: "John" });
    });
  });

  describe("staleTime from config", () => {
    it("should pass staleTime option to plugin context", async () => {
      const plugin = prefetchPlugin({ staleTime: 60000 });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      let capturedPluginOptions: Record<string, unknown> | undefined;
      const pluginExecutor = createMockPluginExecutor((ctx, next) => {
        capturedPluginOptions = (
          ctx as { pluginOptions?: Record<string, unknown> }
        ).pluginOptions;
        return next();
      });

      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch(
        (apiProxy) => (apiProxy as unknown as MockApi)("posts").GET(),
        {
          staleTime: 60000,
        }
      );

      expect(capturedPluginOptions?.staleTime).toBe(60000);
    });

    it("should pass per-request options to plugin context", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      let capturedPluginOptions: Record<string, unknown> | undefined;
      const pluginExecutor = createMockPluginExecutor((ctx, next) => {
        capturedPluginOptions = (
          ctx as { pluginOptions?: Record<string, unknown> }
        ).pluginOptions;
        return next();
      });

      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch(
        (apiProxy) => (apiProxy as unknown as MockApi)("posts").GET(),
        {
          staleTime: 30000,
          retries: 3,
        }
      );

      expect(capturedPluginOptions?.staleTime).toBe(30000);
      expect(capturedPluginOptions?.retries).toBe(3);
    });
  });

  describe("in-flight request deduplication", () => {
    it("should return existing promise when in-flight request exists", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const existingPromise = Promise.resolve({
        data: { posts: [{ id: 1 }] },
        status: 200,
      });

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      stateManager.setPendingPromise(queryKey, existingPromise);

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(api("posts").GET).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { posts: [{ id: 1 }] }, status: 200 });
    });

    it("should share promise between concurrent prefetch calls", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      let resolvePromise: (value: SpooshResponse<unknown, unknown>) => void;
      api("posts").GET.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const promise1 = prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );
      const promise2 = prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      resolvePromise!({ data: { posts: [{ id: 1 }] }, status: 200 });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(api("posts").GET).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it("should make new request after promise is cleared", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      api("posts").GET.mockResolvedValue({
        data: { posts: [{ id: 1 }] },
        status: 200,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      api("posts").GET.mockResolvedValue({
        data: { posts: [{ id: 2 }] },
        status: 200,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(api("posts").GET).toHaveBeenCalledTimes(2);
    });
  });

  describe("timeout clears abandoned promises", () => {
    it("should use default timeout of 30 seconds", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      let resolvePromise: (value: SpooshResponse<unknown, unknown>) => void;
      api("posts").GET.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      prefetch((apiProxy) => (apiProxy as unknown as MockApi)("posts").GET());

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      await vi.advanceTimersByTimeAsync(1);

      expect(stateManager.getPendingPromise(queryKey)).toBeDefined();

      await vi.advanceTimersByTimeAsync(30000);

      expect(stateManager.getPendingPromise(queryKey)).toBeUndefined();

      resolvePromise!({ data: { posts: [] }, status: 200 });
    });

    it("should use custom timeout from config", async () => {
      const plugin = prefetchPlugin({ timeout: 5000 });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      let resolvePromise: (value: SpooshResponse<unknown, unknown>) => void;
      api("posts").GET.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      prefetch((apiProxy) => (apiProxy as unknown as MockApi)("posts").GET());

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      await vi.advanceTimersByTimeAsync(1);

      expect(stateManager.getPendingPromise(queryKey)).toBeDefined();

      await vi.advanceTimersByTimeAsync(4000);
      expect(stateManager.getPendingPromise(queryKey)).toBeDefined();

      await vi.advanceTimersByTimeAsync(1000);
      expect(stateManager.getPendingPromise(queryKey)).toBeUndefined();

      resolvePromise!({ data: { posts: [] }, status: 200 });
    });

    it("should clear timeout when promise resolves", async () => {
      const plugin = prefetchPlugin({ timeout: 5000 });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      api("posts").GET.mockResolvedValue({
        data: { posts: [{ id: 1 }] },
        status: 200,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      expect(stateManager.getPendingPromise(queryKey)).toBeUndefined();

      const cached = stateManager.getCache(queryKey);
      expect(cached?.state.data).toEqual({ posts: [{ id: 1 }] });
    });

    it("should allow new requests after timeout clears promise", async () => {
      const plugin = prefetchPlugin({ timeout: 5000 });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      let resolveFirstPromise: (
        value: SpooshResponse<unknown, unknown>
      ) => void;
      api("posts").GET.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstPromise = resolve;
          })
      );

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      prefetch((apiProxy) => (apiProxy as unknown as MockApi)("posts").GET());

      await vi.advanceTimersByTimeAsync(5000);

      api("posts").GET.mockResolvedValue({
        data: { posts: [{ id: 2 }] },
        status: 200,
      });

      const result = await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(api("posts").GET).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: { posts: [{ id: 2 }] }, status: 200 });

      resolveFirstPromise!({ data: { posts: [] }, status: 200 });
    });
  });

  describe("tags handling", () => {
    it("should resolve and store tags with cache entry", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      api("posts").GET.mockResolvedValue({
        data: { posts: [] },
        status: 200,
      });

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch(
        (apiProxy) => (apiProxy as unknown as MockApi)("posts").GET(),
        {
          tags: ["custom-tag", "extra-tag"],
        }
      );

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.tags).toContain("custom-tag");
      expect(cached?.tags).toContain("extra-tag");
    });
  });

  describe("middleware integration", () => {
    it("should pass context through pluginExecutor.executeMiddleware", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(pluginExecutor.executeMiddleware).toHaveBeenCalledWith(
        "read",
        expect.objectContaining({
          operationType: "read",
          path: "posts",
          method: "GET",
        }),
        expect.any(Function)
      );
    });

    it("should call pluginExecutor.createContext with correct parameters", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(pluginExecutor.createContext).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: "read",
          path: "posts",
          method: "GET",
          stateManager,
          eventEmitter,
        })
      );
    });
  });

  describe("exception handling", () => {
    it("should handle thrown exceptions and store error", async () => {
      const plugin = prefetchPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createMockPluginExecutor();
      const api = createMockApi();

      const thrownError = new Error("Network error");
      api("posts").GET.mockRejectedValue(thrownError);

      const { prefetch } = plugin.instanceApi!({
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
      });

      const result = await prefetch((apiProxy) =>
        (apiProxy as unknown as MockApi)("posts").GET()
      );

      expect(result.error).toBe(thrownError);
      expect(result.status).toBe(0);

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
        options: undefined,
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.state.data).toBeUndefined();
      expect(cached?.state.error).toBeUndefined();
    });
  });
});
