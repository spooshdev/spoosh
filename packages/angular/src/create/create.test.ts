import { vi, describe, it, expect } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor, type SpooshPlugin } from "@spoosh/core";
import { create } from "../index";

vi.mock("@angular/core", () => ({
  signal: <T>(initial: T) => {
    let value = initial;
    const sig = () => value;
    sig.set = (newValue: T) => {
      value = newValue;
    };
    sig.update = (fn: (v: T) => T) => {
      value = fn(value);
    };
    return sig;
  },
  computed: <T>(fn: () => T) => {
    let value = fn();
    const sig = () => value;
    sig.set = (newValue: T) => {
      value = newValue;
    };
    return sig;
  },
  effect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    return { destroy: () => cleanup?.() };
  },
  inject: () => ({
    onDestroy: () => {},
  }),
  DestroyRef: class DestroyRef {},
  untracked: <T>(fn: () => T) => fn(),
}));

function createMockApi() {
  return (path: string) => ({
    GET: () => Promise.resolve({ data: { path }, status: 200 }),
    POST: () => Promise.resolve({ data: { path }, status: 201 }),
  });
}

function createTestInstance(plugins: SpooshPlugin[] = []) {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor(plugins);
  const api = createMockApi();

  return {
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
    _types: {
      schema: {} as unknown,
      defaultError: {} as unknown,
      plugins: [] as const,
    },
  };
}

describe("create", () => {
  describe("Hook Creation", () => {
    it("returns injectRead function", () => {
      const instance = createTestInstance();
      const result = create(instance);

      expect(result.injectRead).toBeDefined();
      expect(typeof result.injectRead).toBe("function");
    });

    it("returns injectWrite function", () => {
      const instance = createTestInstance();
      const result = create(instance);

      expect(result.injectWrite).toBeDefined();
      expect(typeof result.injectWrite).toBe("function");
    });

    it("returns injectPages function", () => {
      const instance = createTestInstance();
      const result = create(instance);

      expect(result.injectPages).toBeDefined();
      expect(typeof result.injectPages).toBe("function");
    });
  });

  describe("Instance APIs", () => {
    it("includes plugin instance APIs", () => {
      const mockInstanceApi = vi.fn().mockReturnValue({
        customMethod: vi.fn(),
        anotherMethod: vi.fn(),
      });

      const plugin: SpooshPlugin = {
        name: "test-plugin",
        operations: ["read"],
        instanceApi: mockInstanceApi,
      };

      const instance = createTestInstance([plugin]);
      const result = create(instance);

      expect(mockInstanceApi).toHaveBeenCalled();
      expect(result).toHaveProperty("customMethod");
      expect(result).toHaveProperty("anotherMethod");
    });

    it("instance APIs work correctly", () => {
      const customMethodImpl = vi.fn().mockReturnValue("custom-result");

      const plugin: SpooshPlugin = {
        name: "test-plugin",
        operations: ["read"],
        instanceApi: () => ({
          customMethod: customMethodImpl,
        }),
      };

      const instance = createTestInstance([plugin]);
      const result = create(instance) as ReturnType<typeof create> & {
        customMethod: typeof customMethodImpl;
      };

      const methodResult = result.customMethod();

      expect(customMethodImpl).toHaveBeenCalled();
      expect(methodResult).toBe("custom-result");
    });
  });
});
