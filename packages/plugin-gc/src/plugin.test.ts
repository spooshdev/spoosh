import { createStateManager } from "@spoosh/test-utils";
import type {
  StateManager,
  InstanceApiContext,
  SetupContext,
} from "@spoosh/core";

import { gcPlugin } from "./plugin";
import type { GcPluginExports } from "./plugin";

function createMockContext(stateManager?: StateManager) {
  const sm = stateManager ?? createStateManager();
  const eventEmitter = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    clear: vi.fn(),
  };
  const pluginExecutor = {
    executeMiddleware: vi.fn(),
    createContext: vi.fn(),
    getPlugins: vi.fn(() => []),
  };

  const setupContext: SetupContext = {
    stateManager: sm,
    eventEmitter,
    pluginExecutor,
  } as unknown as SetupContext;

  const instanceApiContext: InstanceApiContext = {
    api: {},
    stateManager: sm,
    eventEmitter,
    pluginExecutor,
  } as unknown as InstanceApiContext;

  return { setupContext, instanceApiContext, stateManager: sm };
}

describe("gcPlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = gcPlugin();
      expect(plugin.name).toBe("spoosh:gc");
    });

    it("should have empty operations array", () => {
      const plugin = gcPlugin();
      expect(plugin.operations).toEqual([]);
    });

    it("should have instanceApi", () => {
      const plugin = gcPlugin();
      expect(plugin.instanceApi).toBeDefined();
    });
  });

  describe("instanceApi initialization", () => {
    it("should return runGc function", () => {
      const plugin = gcPlugin();
      const { setupContext, instanceApiContext } = createMockContext();

      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      expect(exports.runGc).toBeInstanceOf(Function);
    });
  });

  describe("time-based cleanup (maxAge)", () => {
    it("should remove entries older than maxAge", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("old-entry", {
        state: {
          data: "old",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      vi.setSystemTime(new Date(5000));
      stateManager.setCache("new-entry", {
        state: {
          data: "new",
          error: undefined,
          timestamp: 5000,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 3000 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(6000));
      const removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getCache("old-entry")).toBeUndefined();
      expect(stateManager.getCache("new-entry")).toBeDefined();
    });

    it("should keep entries younger than maxAge", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(5000));
      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 5000,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 10000 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(6000));
      const removed = exports.runGc();

      expect(removed).toBe(0);
      expect(stateManager.getCache("entry")).toBeDefined();
    });

    it("should remove all entries when all are older than maxAge", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("entry1", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });
      stateManager.setCache("entry2", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 1000 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(2000));
      const removed = exports.runGc();

      expect(removed).toBe(2);
      expect(stateManager.getSize()).toBe(0);
    });
  });

  describe("size-based cleanup (maxEntries)", () => {
    it("should remove oldest entries when exceeding maxEntries", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry1", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 1000,
        },
        tags: [],
      });
      stateManager.setCache("entry2", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 2000,
        },
        tags: [],
      });
      stateManager.setCache("entry3", {
        state: {
          data: "3",
          error: undefined,
          timestamp: 3000,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxEntries: 2 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getCache("entry1")).toBeUndefined();
      expect(stateManager.getCache("entry2")).toBeDefined();
      expect(stateManager.getCache("entry3")).toBeDefined();
    });

    it("should not remove entries when under maxEntries", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry1", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 1000,
        },
        tags: [],
      });
      stateManager.setCache("entry2", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 2000,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxEntries: 5 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(0);
      expect(stateManager.getSize()).toBe(2);
    });

    it("should remove multiple entries to reach maxEntries", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      for (let i = 1; i <= 5; i++) {
        stateManager.setCache(`entry${i}`, {
          state: {
            data: `${i}`,
            error: undefined,
            timestamp: i * 1000,
          },
          tags: [],
        });
      }

      const plugin = gcPlugin({ maxEntries: 2 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(3);
      expect(stateManager.getSize()).toBe(2);
      expect(stateManager.getCache("entry4")).toBeDefined();
      expect(stateManager.getCache("entry5")).toBeDefined();
    });
  });

  describe("combined cleanup (maxAge + maxEntries)", () => {
    it("should apply both maxAge and maxEntries", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("very-old", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      vi.setSystemTime(new Date(5000));
      stateManager.setCache("medium1", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 5000,
        },
        tags: [],
      });
      stateManager.setCache("medium2", {
        state: {
          data: "3",
          error: undefined,
          timestamp: 5001,
        },
        tags: [],
      });
      stateManager.setCache("medium3", {
        state: {
          data: "4",
          error: undefined,
          timestamp: 5002,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 3000, maxEntries: 2 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(6000));
      const removed = exports.runGc();

      expect(removed).toBe(2);
      expect(stateManager.getCache("very-old")).toBeUndefined();
      expect(stateManager.getCache("medium1")).toBeUndefined();
      expect(stateManager.getCache("medium2")).toBeDefined();
      expect(stateManager.getCache("medium3")).toBeDefined();
    });
  });

  describe("interval control", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should run gc at specified interval", () => {
      const { setupContext, stateManager } = createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 5000, interval: 10000 });
      plugin.setup?.(setupContext);

      expect(stateManager.getCache("entry")).toBeDefined();

      vi.setSystemTime(new Date(6000));
      vi.advanceTimersByTime(10000);

      expect(stateManager.getCache("entry")).toBeUndefined();
    });

    it("should use default interval of 60000ms", () => {
      const { setupContext, stateManager } = createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxAge: 30000 });
      plugin.setup?.(setupContext);

      vi.setSystemTime(new Date(31000));
      vi.advanceTimersByTime(59999);
      expect(stateManager.getCache("entry")).toBeDefined();

      vi.advanceTimersByTime(1);
      expect(stateManager.getCache("entry")).toBeUndefined();
    });
  });

  describe("subscriber awareness", () => {
    it("should NOT delete entries with active subscribers (maxAge)", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("subscribed-entry", {
        state: {
          data: "subscribed",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });
      stateManager.setCache("unsubscribed-entry", {
        state: {
          data: "unsubscribed",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      stateManager.subscribeCache("subscribed-entry", () => {});

      const plugin = gcPlugin({ maxAge: 3000 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(5000));
      const removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getCache("subscribed-entry")).toBeDefined();
      expect(stateManager.getCache("unsubscribed-entry")).toBeUndefined();
    });

    it("should delete entries after subscribers unsubscribe", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      vi.setSystemTime(new Date(0));
      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const unsubscribe = stateManager.subscribeCache("entry", () => {});

      const plugin = gcPlugin({ maxAge: 3000 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(5000));
      let removed = exports.runGc();

      expect(removed).toBe(0);
      expect(stateManager.getCache("entry")).toBeDefined();

      unsubscribe();
      removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getCache("entry")).toBeUndefined();
    });

    it("should NOT delete entries with active subscribers (maxEntries)", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry1-subscribed", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 1000,
        },
        tags: [],
      });
      stateManager.setCache("entry2", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 2000,
        },
        tags: [],
      });
      stateManager.setCache("entry3", {
        state: {
          data: "3",
          error: undefined,
          timestamp: 3000,
        },
        tags: [],
      });

      stateManager.subscribeCache("entry1-subscribed", () => {});

      const plugin = gcPlugin({ maxEntries: 2 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getCache("entry1-subscribed")).toBeDefined();
      expect(stateManager.getCache("entry2")).toBeUndefined();
      expect(stateManager.getCache("entry3")).toBeDefined();
    });

    it("should not count subscriber-protected entries against limit when removing", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry1-subscribed", {
        state: {
          data: "1",
          error: undefined,
          timestamp: 1000,
        },
        tags: [],
      });
      stateManager.setCache("entry2-subscribed", {
        state: {
          data: "2",
          error: undefined,
          timestamp: 2000,
        },
        tags: [],
      });
      stateManager.setCache("entry3", {
        state: {
          data: "3",
          error: undefined,
          timestamp: 3000,
        },
        tags: [],
      });
      stateManager.setCache("entry4", {
        state: {
          data: "4",
          error: undefined,
          timestamp: 4000,
        },
        tags: [],
      });

      stateManager.subscribeCache("entry1-subscribed", () => {});
      stateManager.subscribeCache("entry2-subscribed", () => {});

      const plugin = gcPlugin({ maxEntries: 2 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(2);
      expect(stateManager.getCache("entry1-subscribed")).toBeDefined();
      expect(stateManager.getCache("entry2-subscribed")).toBeDefined();
      expect(stateManager.getCache("entry3")).toBeUndefined();
      expect(stateManager.getCache("entry4")).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty cache", () => {
      const { setupContext, instanceApiContext } = createMockContext();

      const plugin = gcPlugin({ maxAge: 1000, maxEntries: 10 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(0);
    });

    it("should handle no options (no cleanup)", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const plugin = gcPlugin();
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      vi.setSystemTime(new Date(999999999));
      const removed = exports.runGc();

      expect(removed).toBe(0);
      expect(stateManager.getCache("entry")).toBeDefined();
    });

    it("should handle maxEntries of 0", () => {
      const { setupContext, instanceApiContext, stateManager } =
        createMockContext();

      stateManager.setCache("entry", {
        state: {
          data: "data",
          error: undefined,
          timestamp: 0,
        },
        tags: [],
      });

      const plugin = gcPlugin({ maxEntries: 0 });
      plugin.setup?.(setupContext);
      const exports = plugin.instanceApi!(
        instanceApiContext
      ) as GcPluginExports;

      const removed = exports.runGc();

      expect(removed).toBe(1);
      expect(stateManager.getSize()).toBe(0);
    });
  });
});
