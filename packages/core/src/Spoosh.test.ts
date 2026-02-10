import { describe, it, expect } from "vitest";
import { Spoosh } from "./Spoosh";
import type { SpooshPlugin } from "./plugins/types";

function createMockPlugin(name: string): SpooshPlugin {
  return {
    name,
    operations: ["read"],
  };
}

describe("Spoosh", () => {
  describe("constructor", () => {
    it("creates instance with baseUrl", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh).toBeDefined();
      expect(spoosh).toBeInstanceOf(Spoosh);
    });

    it("creates instance with baseUrl and defaultOptions", () => {
      const spoosh = new Spoosh("/api", { headers: { "X-Custom": "value" } });

      expect(spoosh).toBeDefined();
    });
  });

  describe("use() method", () => {
    it("returns new Spoosh instance with plugins", () => {
      const spoosh1 = new Spoosh("/api");
      const spoosh2 = spoosh1.use([createMockPlugin("test-plugin")]);

      expect(spoosh2).toBeInstanceOf(Spoosh);
      expect(spoosh2).not.toBe(spoosh1);
    });

    it("preserves baseUrl and defaultOptions", () => {
      const spoosh1 = new Spoosh("/api", { headers: { "X-Test": "value" } });
      const spoosh2 = spoosh1.use([createMockPlugin("test-plugin")]);

      expect(spoosh2.config.baseUrl).toBe("/api");
      expect(spoosh2.config.defaultOptions.headers).toEqual({
        "X-Test": "value",
      });
    });
  });

  describe("lazy initialization", () => {
    it("does not create instance until accessed", () => {
      const spoosh = new Spoosh("/api");

      // @ts-expect-error - accessing private property for test
      expect(spoosh._instance).toBeUndefined();
    });

    it("creates instance on first property access", () => {
      const spoosh = new Spoosh("/api");

      const { api } = spoosh;

      // @ts-expect-error - accessing private property for test
      expect(spoosh._instance).toBeDefined();
      expect(api).toBeDefined();
    });

    it("reuses same instance on multiple accesses", () => {
      const spoosh = new Spoosh("/api");

      const api1 = spoosh.api;
      const api2 = spoosh.api;

      expect(api1).toBe(api2);
    });
  });

  describe("property getters", () => {
    it("exposes api property", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh.api).toBeDefined();
    });

    it("exposes stateManager property", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh.stateManager).toBeDefined();
      expect(typeof spoosh.stateManager.getCache).toBe("function");
    });

    it("exposes eventEmitter property", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh.eventEmitter).toBeDefined();
      expect(typeof spoosh.eventEmitter.on).toBe("function");
    });

    it("exposes pluginExecutor property", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh.pluginExecutor).toBeDefined();
      expect(typeof spoosh.pluginExecutor.getPlugins).toBe("function");
    });

    it("exposes config property", () => {
      const spoosh = new Spoosh("/api", { headers: { "X-Test": "value" } });

      expect(spoosh.config).toBeDefined();
      expect(spoosh.config.baseUrl).toBe("/api");
      expect(spoosh.config.defaultOptions).toEqual({
        headers: { "X-Test": "value" },
      });
    });

    it("exposes _types property", () => {
      const plugin = createMockPlugin("test-plugin");
      const spoosh = new Spoosh("/api").use([plugin]);

      expect(spoosh._types).toBeDefined();
      expect(spoosh._types.schema).toBeUndefined();
      expect(spoosh._types.defaultError).toBeUndefined();
      expect(spoosh._types.plugins).toEqual([plugin]);
    });
  });

  describe("destructuring support", () => {
    it("allows destructuring of properties", () => {
      const spoosh = new Spoosh("/api");

      const { api, stateManager, eventEmitter } = spoosh;

      expect(api).toBeDefined();
      expect(stateManager).toBeDefined();
      expect(eventEmitter).toBeDefined();
    });
  });

  describe("method chaining", () => {
    it("supports use() call", () => {
      const plugin = createMockPlugin("test-plugin");

      const spoosh = new Spoosh("/api").use([plugin]);

      expect(spoosh.pluginExecutor.getPlugins()).toHaveLength(1);
    });

    it("allows immediate destructuring after use()", () => {
      const plugin = createMockPlugin("test-plugin");

      const { api } = new Spoosh("/api").use([plugin]);

      expect(api).toBeDefined();
    });
  });

  describe("plugin integration", () => {
    it("passes plugins to createSpoosh", () => {
      const plugin1 = createMockPlugin("plugin-1");
      const plugin2 = createMockPlugin("plugin-2");

      const spoosh = new Spoosh("/api").use([plugin1, plugin2]);

      expect(spoosh.pluginExecutor.getPlugins()).toHaveLength(2);
      expect(spoosh.pluginExecutor.getPlugins()[0]?.name).toBe("plugin-1");
      expect(spoosh.pluginExecutor.getPlugins()[1]?.name).toBe("plugin-2");
    });

    it("creates instance with no plugins", () => {
      const spoosh = new Spoosh("/api");

      expect(spoosh.pluginExecutor.getPlugins()).toHaveLength(0);
    });
  });
});
