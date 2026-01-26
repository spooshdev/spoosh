import type {
  SpooshResponse,
  StateManager,
  InstanceApiContext,
} from "@spoosh/core";
import {
  createMockContext,
  createStateManager,
  createEventEmitter,
} from "@spoosh/test-utils";

import { invalidationPlugin } from "./plugin";
import type {
  InvalidationPluginExports,
  InvalidationInstanceApi,
} from "./types";

function createMockInstanceApiContext(
  stateManager?: StateManager
): InstanceApiContext {
  return {
    api: {},
    stateManager: stateManager ?? createStateManager(),
    eventEmitter: createEventEmitter(),
    pluginExecutor: {
      executeMiddleware: vi.fn(),
      createContext: vi.fn(),
    },
  } as unknown as InstanceApiContext;
}

describe("invalidationPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = invalidationPlugin();
      expect(plugin.name).toBe("spoosh:invalidation");
    });

    it("should operate on write operations only", () => {
      const plugin = invalidationPlugin();
      expect(plugin.operations).toEqual(["write"]);
    });
  });

  describe("exports", () => {
    it("should export setDefaultMode function", () => {
      const plugin = invalidationPlugin();
      const context = createMockContext();
      const pluginExports = plugin.exports!(
        context
      ) as InvalidationPluginExports;

      expect(pluginExports.setDefaultMode).toBeDefined();
      expect(typeof pluginExports.setDefaultMode).toBe("function");
    });

    it("should store defaultMode in metadata", () => {
      const plugin = invalidationPlugin();
      const metadata = new Map();
      const context = createMockContext({ metadata });
      const pluginExports = plugin.exports!(
        context
      ) as InvalidationPluginExports;

      pluginExports.setDefaultMode("none");

      expect(metadata.get("invalidation:defaultMode")).toBe("none");
    });
  });

  describe("default mode: all", () => {
    it("should invalidate all context tags on successful mutation", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const entry1 = stateManager.getCache('{"method":"GET","path":["users"]}');
      const entry2 = stateManager.getCache(
        '{"method":"GET","path":["users","1"]}'
      );
      expect(entry1?.stale).toBe(true);
      expect(entry2?.stale).toBe(true);
    });

    it("should emit invalidate event with tags", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["users", "users/1"]);
    });
  });

  describe("default mode: self", () => {
    it("should only invalidate self tag", () => {
      const plugin = invalidationPlugin({ defaultMode: "self" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const entry1 = stateManager.getCache('{"method":"GET","path":["users"]}');
      const entry2 = stateManager.getCache(
        '{"method":"GET","path":["users","1"]}'
      );
      expect(entry1?.stale).toBe(false);
      expect(entry2?.stale).toBe(true);
    });
  });

  describe("default mode: none", () => {
    it("should not invalidate any tags automatically", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const entry = stateManager.getCache('{"method":"GET","path":["users"]}');
      expect(entry?.stale).toBe(false);
      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("invalidate option with mode string", () => {
    it("should override default mode with 'all'", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: "all",
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["users", "users/1"]);
    });

    it("should override default mode with 'self'", () => {
      const plugin = invalidationPlugin({ defaultMode: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        path: ["users", "1"],
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: "self",
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["users/1"]);
    });

    it("should override default mode with 'none'", () => {
      const plugin = invalidationPlugin({ defaultMode: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: "none",
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("invalidate option with tags array", () => {
    it("should invalidate specific tags from array", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["posts"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["comments"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["comments"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
        pluginOptions: {
          invalidate: ["posts", "comments"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const postsEntry = stateManager.getCache(
        '{"method":"GET","path":["posts"]}'
      );
      const commentsEntry = stateManager.getCache(
        '{"method":"GET","path":["comments"]}'
      );
      expect(postsEntry?.stale).toBe(true);
      expect(commentsEntry?.stale).toBe(true);
    });

    it("should not add mode tags when array has tags only", () => {
      const plugin = invalidationPlugin({ defaultMode: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
        pluginOptions: {
          invalidate: ["posts"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["posts"]);
    });
  });

  describe("invalidate option with mode + tags array", () => {
    it("should combine 'all' mode with explicit tags (mode at start)", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: ["all", "posts", "custom-tag"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const calledTags = invalidateHandler.mock.calls[0]?.[0] as string[];
      expect(calledTags).toContain("posts");
      expect(calledTags).toContain("custom-tag");
      expect(calledTags).toContain("users");
      expect(calledTags).toContain("users/1");
    });

    it("should combine 'self' mode with explicit tags (mode at end)", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        path: ["users", "1"],
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: ["posts", "dashboard", "self"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const calledTags = invalidateHandler.mock.calls[0]?.[0] as string[];
      expect(calledTags).toContain("posts");
      expect(calledTags).toContain("dashboard");
      expect(calledTags).toContain("users/1");
    });

    it("should combine 'all' mode with explicit tags (mode in middle)", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: ["posts", "all", "dashboard"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const calledTags = invalidateHandler.mock.calls[0]?.[0] as string[];
      expect(calledTags).toContain("posts");
      expect(calledTags).toContain("dashboard");
      expect(calledTags).toContain("users");
      expect(calledTags).toContain("users/1");
    });
  });

  describe("metadata override via exports", () => {
    it("should use metadata override when set via exports", () => {
      const plugin = invalidationPlugin({ defaultMode: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const metadata = new Map();

      metadata.set("invalidation:defaultMode", "none");

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        metadata,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should not invalidate on error response", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        error: { message: "Server error" },
        status: 500,
      };

      plugin.afterResponse!(context, response);

      const entry = stateManager.getCache('{"method":"GET","path":["users"]}');
      expect(entry?.stale).toBe(false);
      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("tag deduplication", () => {
    it("should deduplicate tags before invalidation", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: ["all", "users", "posts"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      const calledTags = invalidateHandler.mock.calls[0]?.[0] as string[];
      expect(calledTags).toContain("users");
      expect(calledTags).toContain("users/1");
      expect(calledTags).toContain("posts");
      expect(calledTags.filter((t) => t === "users").length).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should not emit event when no tags to invalidate", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: [],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });

    it("should handle empty invalidate array", () => {
      const plugin = invalidationPlugin({ defaultMode: "none" });
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        eventEmitter,
        pluginOptions: {
          invalidate: [],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.afterResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("instanceApi", () => {
    it("should have instanceApi defined", () => {
      const plugin = invalidationPlugin();
      expect(plugin.instanceApi).toBeDefined();
    });

    it("should return invalidate function", () => {
      const plugin = invalidationPlugin();
      const context = createMockInstanceApiContext();
      const instanceApi = plugin.instanceApi!(
        context
      ) as InvalidationInstanceApi;

      expect(instanceApi.invalidate).toBeDefined();
      expect(typeof instanceApi.invalidate).toBe("function");
    });

    it("should mark cache entries as stale when invalidate is called with array", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["posts"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        stale: false,
      });

      const context = createMockInstanceApiContext(stateManager);
      const instanceApi = plugin.instanceApi!(
        context
      ) as InvalidationInstanceApi;

      instanceApi.invalidate(["users"]);

      const usersEntry = stateManager.getCache(
        '{"method":"GET","path":["users"]}'
      );
      const postsEntry = stateManager.getCache(
        '{"method":"GET","path":["posts"]}'
      );
      expect(usersEntry?.stale).toBe(true);
      expect(postsEntry?.stale).toBe(false);
    });

    it("should mark cache entries as stale when invalidate is called with string", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockInstanceApiContext(stateManager);
      const instanceApi = plugin.instanceApi!(
        context
      ) as InvalidationInstanceApi;

      instanceApi.invalidate("users");

      const usersEntry = stateManager.getCache(
        '{"method":"GET","path":["users"]}'
      );
      expect(usersEntry?.stale).toBe(true);
    });

    it("should emit invalidate event when invalidate is called", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = {
        api: {},
        stateManager,
        eventEmitter,
        pluginExecutor: {
          executeMiddleware: vi.fn(),
          createContext: vi.fn(),
        },
      } as unknown as InstanceApiContext;

      const instanceApi = plugin.instanceApi!(
        context
      ) as InvalidationInstanceApi;

      instanceApi.invalidate(["users", "posts"]);

      expect(invalidateHandler).toHaveBeenCalledWith(["users", "posts"]);
    });

    it("should not emit event when empty array is passed", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = {
        api: {},
        stateManager,
        eventEmitter,
        pluginExecutor: {
          executeMiddleware: vi.fn(),
          createContext: vi.fn(),
        },
      } as unknown as InstanceApiContext;

      const instanceApi = plugin.instanceApi!(
        context
      ) as InvalidationInstanceApi;

      instanceApi.invalidate([]);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });
});
