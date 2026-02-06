import { createOperationController } from "./controller";
import { createStateManager, createInitialState } from "../state/manager";
import { createEventEmitter } from "../events/emitter";
import { createPluginExecutor } from "../plugins/executor";
import type { SpooshResponse } from "../types/response.types";

function createTestController<TData = unknown, TError = unknown>(options?: {
  tags?: string[];
  path?: string;
  method?: "GET" | "POST";
  fetchFn?: () => Promise<SpooshResponse<TData, TError>>;
}) {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([]);

  const controller = createOperationController<TData, TError>({
    operationType: "read",
    path: options?.path ?? "posts",
    method: options?.method ?? "GET",
    tags: options?.tags ?? ["posts"],
    stateManager,
    eventEmitter,
    pluginExecutor,
    fetchFn:
      options?.fetchFn ??
      (async () => ({
        status: 200,
        data: { id: 1, title: "Test Post" } as TData,
        error: undefined,
      })),
  });

  return { controller, stateManager, eventEmitter, pluginExecutor };
}

describe("createOperationController", () => {
  describe("cache tag management", () => {
    it("should set tags when creating new cache entry via execute", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts", "list"],
      });

      await controller.execute();

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });
      const cached = stateManager.getCache(queryKey);

      expect(cached?.tags).toEqual(["posts", "list"]);
    });

    it("should update tags when cache entry was pre-created by setMeta with empty tags", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts"],
      });

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setMeta(queryKey, { someMetaKey: "someValue" });

      const cachedBeforeExecute = stateManager.getCache(queryKey);
      expect(cachedBeforeExecute?.tags).toEqual([]);

      await controller.execute();

      const cachedAfterExecute = stateManager.getCache(queryKey);
      expect(cachedAfterExecute?.tags).toEqual(["posts"]);
    });

    it("should allow markStale to work after setMeta pre-creates entry", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts"],
      });

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setMeta(queryKey, { initialData: true });
      await controller.execute();

      stateManager.markStale(["posts"]);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.stale).toBe(true);
    });

    it("should not mark as stale when tags do not match", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts"],
      });

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setMeta(queryKey, { initialData: true });
      await controller.execute();

      stateManager.markStale(["users"]);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.stale).toBe(false);
    });

    it("should preserve tags across multiple successful executions", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts", "feed"],
      });

      await controller.execute();
      await controller.execute();
      await controller.execute();

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });
      const cached = stateManager.getCache(queryKey);

      expect(cached?.tags).toEqual(["posts", "feed"]);
    });

    it("should update tags even when entry exists with different tags", async () => {
      const { controller, stateManager } = createTestController({
        tags: ["posts"],
      });

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setCache(queryKey, {
        state: createInitialState(),
        tags: ["old-tag"],
      });

      await controller.execute();

      const cached = stateManager.getCache(queryKey);
      expect(cached?.tags).toEqual(["posts"]);
    });
  });

  describe("cache invalidation integration", () => {
    it("should support cross-component invalidation scenario", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);

      const readController = createOperationController({
        operationType: "read",
        path: "posts",
        method: "GET",
        tags: ["posts"],
        stateManager,
        eventEmitter,
        pluginExecutor,
        fetchFn: async () => ({
          status: 200,
          data: [{ id: 1, title: "Post 1" }],
          error: undefined,
        }),
      });

      const writeController = createOperationController({
        operationType: "write",
        path: "posts",
        method: "POST",
        tags: ["posts"],
        stateManager,
        eventEmitter,
        pluginExecutor,
        fetchFn: async () => ({
          status: 201,
          data: { id: 2, title: "New Post" },
          error: undefined,
        }),
      });

      const readQueryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setMeta(readQueryKey, { fromInitialDataPlugin: true });

      await readController.execute();

      const cachedBeforeWrite = stateManager.getCache(readQueryKey);
      expect(cachedBeforeWrite?.stale).toBe(false);
      expect(cachedBeforeWrite?.tags).toEqual(["posts"]);

      await writeController.execute();

      stateManager.markStale(["posts"]);

      const cachedAfterWrite = stateManager.getCache(readQueryKey);
      expect(cachedAfterWrite?.stale).toBe(true);
    });

    it("should handle multiple reads with same tags being invalidated together", async () => {
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([]);

      const createReadController = (path: string) =>
        createOperationController({
          operationType: "read",
          path,
          method: "GET",
          tags: ["posts"],
          stateManager,
          eventEmitter,
          pluginExecutor,
          fetchFn: async () => ({
            status: 200,
            data: { path },
            error: undefined,
          }),
        });

      const listController = createReadController("posts");
      const detailController = createReadController("posts/1");

      const listKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });
      const detailKey = stateManager.createQueryKey({
        path: "posts/1",
        method: "GET",
      });

      stateManager.setMeta(listKey, { plugin: "initialData" });
      stateManager.setMeta(detailKey, { plugin: "initialData" });

      await listController.execute();
      await detailController.execute();

      stateManager.markStale(["posts"]);

      expect(stateManager.getCache(listKey)?.stale).toBe(true);
      expect(stateManager.getCache(detailKey)?.stale).toBe(true);
    });
  });

  describe("execute", () => {
    it("should update state with data on successful fetch", async () => {
      const { controller } = createTestController({
        fetchFn: async () => ({
          status: 200,
          data: { message: "success" },
          error: undefined,
        }),
      });

      const response = await controller.execute();

      expect(response.data).toEqual({ message: "success" });
      expect(response.error).toBeUndefined();

      const state = controller.getState();
      expect(state.data).toEqual({ message: "success" });
    });

    it("should not update state when response has error", async () => {
      const { controller } = createTestController({
        fetchFn: async () => ({
          status: 500,
          data: undefined,
          error: new Error("Server error"),
        }),
      });

      await controller.execute();

      const state = controller.getState();
      expect(state.data).toBeUndefined();
    });

    it("should set stale to false after successful execution", async () => {
      const { controller, stateManager } = createTestController();

      const queryKey = stateManager.createQueryKey({
        path: "posts",
        method: "GET",
      });

      stateManager.setCache(queryKey, {
        state: createInitialState(),
        tags: ["posts"],
        stale: true,
      });

      await controller.execute();

      const cached = stateManager.getCache(queryKey);
      expect(cached?.stale).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("should notify subscribers when state changes", async () => {
      const { controller } = createTestController();
      const callback = vi.fn();

      controller.subscribe(callback);
      await controller.execute();

      expect(callback).toHaveBeenCalled();
    });

    it("should return unsubscribe function", async () => {
      const { controller } = createTestController();
      const callback = vi.fn();

      const unsubscribe = controller.subscribe(callback);
      unsubscribe();
      await controller.execute();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("abort", () => {
    it("should abort ongoing request", async () => {
      const { controller } = createTestController({
        fetchFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { status: 200, data: "data", error: undefined };
        },
      });

      const executePromise = controller.execute();
      controller.abort();

      const response = await executePromise;
      expect(response.status).toBe(200);
    });
  });

  describe("getState", () => {
    it("should return initial state before any execution", () => {
      const { controller } = createTestController();

      const state = controller.getState();

      expect(state.data).toBeUndefined();
      expect(state.error).toBeUndefined();
      expect(state.timestamp).toBe(0);
    });

    it("should return cached state after execution", async () => {
      const { controller } = createTestController({
        fetchFn: async () => ({
          status: 200,
          data: { cached: true },
          error: undefined,
        }),
      });

      await controller.execute();
      const state = controller.getState();

      expect(state.data).toEqual({ cached: true });
    });
  });
});
