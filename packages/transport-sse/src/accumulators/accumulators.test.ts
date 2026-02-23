import { describe, it, expect } from "vitest";
import {
  replaceAccumulate,
  concatAccumulate,
  mergeAccumulate,
  getAccumulator,
  resolveAccumulator,
} from "./accumulators";

describe("accumulators", () => {
  describe("replaceAccumulate", () => {
    it("should replace previous value with current", () => {
      expect(replaceAccumulate("old", "new")).toBe("new");
      expect(replaceAccumulate(42, 100)).toBe(100);
      expect(replaceAccumulate({ old: true }, { new: true })).toEqual({ new: true });
    });

    it("should handle undefined previous value", () => {
      expect(replaceAccumulate(undefined, "new")).toBe("new");
    });

    it("should skip when current is undefined", () => {
      expect(replaceAccumulate("old", undefined)).toBe("old");
      expect(replaceAccumulate({ data: true }, undefined)).toEqual({ data: true });
    });
  });

  describe("concatAccumulate", () => {
    it("should concatenate strings", () => {
      expect(concatAccumulate("Hello ", "World")).toBe("Hello World");
    });

    it("should convert to strings and concatenate", () => {
      expect(concatAccumulate(42, 100)).toBe("42100");
      expect(concatAccumulate("Count: ", 42)).toBe("Count: 42");
    });

    it("should handle undefined previous value", () => {
      expect(concatAccumulate(undefined, "new")).toBe("new");
    });

    it("should build streaming text", () => {
      let result = concatAccumulate(undefined, "Hello");
      result = concatAccumulate(result, " ");
      result = concatAccumulate(result, "World");
      expect(result).toBe("Hello World");
    });

    it("should skip when current is undefined", () => {
      expect(concatAccumulate("existing", undefined)).toBe("existing");
      expect(concatAccumulate(undefined, undefined)).toBe("");
    });
  });

  describe("mergeAccumulate", () => {
    it("should merge objects", () => {
      const prev = { a: 1, b: 2 };
      const current = { b: 3, c: 4 };
      expect(mergeAccumulate(prev, current)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("should replace non-objects with current", () => {
      expect(mergeAccumulate("old", "new")).toBe("new");
      expect(mergeAccumulate(42, 100)).toBe(100);
    });

    it("should handle undefined previous value", () => {
      expect(mergeAccumulate(undefined, { new: true })).toEqual({ new: true });
    });

    it("should handle null values", () => {
      expect(mergeAccumulate(null, { new: true })).toEqual({ new: true });
      expect(mergeAccumulate({ old: true }, null)).toBe(null);
    });

    it("should not merge arrays", () => {
      expect(mergeAccumulate([1, 2], [3, 4])).toEqual([3, 4]);
    });

    it("should build partial object updates", () => {
      let result = mergeAccumulate(undefined, { status: "loading" });
      result = mergeAccumulate(result, { progress: 50 });
      result = mergeAccumulate(result, { status: "done", progress: 100 });
      expect(result).toEqual({ status: "done", progress: 100 });
    });

    it("should skip when current is undefined", () => {
      expect(mergeAccumulate({ data: true }, undefined)).toEqual({ data: true });
      expect(mergeAccumulate(undefined, undefined)).toBeUndefined();
    });
  });

  describe("getAccumulator", () => {
    it("should return correct accumulator for each strategy", () => {
      expect(getAccumulator("replace")).toBe(replaceAccumulate);
      expect(getAccumulator("concat")).toBe(concatAccumulate);
      expect(getAccumulator("merge")).toBe(mergeAccumulate);
    });

    it("should default to replaceAccumulate for unknown strategy", () => {
      expect(getAccumulator("unknown" as never)).toBe(replaceAccumulate);
    });
  });

  describe("resolveAccumulator", () => {
    it("should return replaceAccumulate when config is undefined", () => {
      expect(resolveAccumulator(undefined, "message")).toBe(replaceAccumulate);
    });

    it("should use global strategy", () => {
      expect(resolveAccumulator("concat", "message")).toBe(concatAccumulate);
    });

    it("should use custom function", () => {
      const customFn = (prev: unknown, current: unknown) => [prev, current];
      expect(resolveAccumulator(customFn, "message")).toBe(customFn);
    });

    it("should use per-event strategy", () => {
      const config = {
        chunk: "concat" as const,
        done: "replace" as const,
      };
      expect(resolveAccumulator(config, "chunk")).toBe(concatAccumulate);
      expect(resolveAccumulator(config, "done")).toBe(replaceAccumulate);
    });

    it("should use per-event custom function", () => {
      const customFn = (prev: unknown, current: unknown) => [prev, current];
      const config = {
        chunk: customFn,
        done: "replace" as const,
      };
      expect(resolveAccumulator(config, "chunk")).toBe(customFn);
    });

    it("should fallback to replaceAccumulate for unmapped events", () => {
      const config = {
        chunk: "concat" as const,
      };
      expect(resolveAccumulator(config, "unknown")).toBe(replaceAccumulate);
    });
  });
});
