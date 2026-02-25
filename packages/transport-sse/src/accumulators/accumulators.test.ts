import { describe, it, expect } from "vitest";
import {
  replaceAccumulate,
  mergeAccumulate,
  getAccumulator,
  resolveAccumulator,
} from "./accumulators";

describe("accumulators", () => {
  describe("replaceAccumulate", () => {
    it("should replace previous value with current", () => {
      expect(replaceAccumulate("old", "new")).toBe("new");
      expect(replaceAccumulate(42, 100)).toBe(100);
      expect(replaceAccumulate({ old: true }, { new: true })).toEqual({
        new: true,
      });
    });

    it("should handle undefined previous value", () => {
      expect(replaceAccumulate(undefined, "new")).toBe("new");
    });

    it("should skip when current is undefined", () => {
      expect(replaceAccumulate("old", undefined)).toBe("old");
      expect(replaceAccumulate({ data: true }, undefined)).toEqual({
        data: true,
      });
    });
  });

  describe("mergeAccumulate", () => {
    it("should concatenate strings", () => {
      expect(mergeAccumulate("Hello ", "World")).toBe("Hello World");
    });

    it("should replace when types differ", () => {
      expect(mergeAccumulate("Count: ", 42)).toBe(42);
      expect(mergeAccumulate(100, "text")).toBe("text");
    });

    it("should merge objects", () => {
      const prev = { a: 1, b: 2 };
      const current = { b: 3, c: 4 };
      expect(mergeAccumulate(prev, current)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("should handle undefined previous value", () => {
      expect(mergeAccumulate(undefined, "new")).toBe("new");
      expect(mergeAccumulate(undefined, { new: true })).toEqual({ new: true });
    });

    it("should handle null values", () => {
      expect(mergeAccumulate(null, { new: true })).toEqual({ new: true });
      expect(mergeAccumulate({ old: true }, null)).toBe(null);
    });

    it("should concatenate arrays", () => {
      expect(mergeAccumulate([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
    });

    it("should use current array when prev is not array", () => {
      expect(mergeAccumulate("not array", [1, 2])).toEqual([1, 2]);
      expect(mergeAccumulate(undefined, [1, 2])).toEqual([1, 2]);
    });

    it("should build streaming array", () => {
      let result = mergeAccumulate(undefined, ["chunk1"]);
      result = mergeAccumulate(result, ["chunk2"]);
      result = mergeAccumulate(result, ["chunk3"]);
      expect(result).toEqual(["chunk1", "chunk2", "chunk3"]);
    });

    it("should build streaming text", () => {
      let result = mergeAccumulate(undefined, "Hello");
      result = mergeAccumulate(result, " ");
      result = mergeAccumulate(result, "World");
      expect(result).toBe("Hello World");
    });

    it("should build partial object updates", () => {
      let result = mergeAccumulate(undefined, { status: "loading" });
      result = mergeAccumulate(result, { progress: 50 });
      result = mergeAccumulate(result, { status: "done", progress: 100 });
      expect(result).toEqual({ status: "done", progress: 100 });
    });

    it("should skip when current is undefined", () => {
      expect(mergeAccumulate({ data: true }, undefined)).toEqual({
        data: true,
      });
      expect(mergeAccumulate(undefined, undefined)).toBeUndefined();
    });
  });

  describe("getAccumulator", () => {
    it("should return correct accumulator for each strategy", () => {
      expect(getAccumulator("replace")).toBe(replaceAccumulate);
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
      expect(resolveAccumulator("merge", "message")).toBe(mergeAccumulate);
      expect(resolveAccumulator("replace", "message")).toBe(replaceAccumulate);
    });

    it("should use custom function", () => {
      const customFn = (prev: unknown, current: unknown) => [prev, current];
      expect(resolveAccumulator(customFn, "message")).toBe(customFn);
    });

    it("should use per-event strategy", () => {
      const config = {
        chunk: "merge" as const,
        done: "replace" as const,
      };
      expect(resolveAccumulator(config, "chunk")).toBe(mergeAccumulate);
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
        chunk: "merge" as const,
      };
      expect(resolveAccumulator(config, "unknown")).toBe(replaceAccumulate);
    });

    describe("field-specific config", () => {
      it("should merge specific field and replace others", () => {
        const config = {
          chunk: { text: "merge" as const },
        };
        const accumulator = resolveAccumulator(config, "chunk");

        const prev = { id: "1", text: "hello" };
        const curr = { id: "2", text: " world" };
        const result = accumulator(prev, curr);

        expect(result).toEqual({ id: "2", text: "hello world" });
      });

      it("should handle per-event field config", () => {
        const config = {
          chunk: { text: "merge" as const },
          done: "replace" as const,
        };

        const chunkAccumulator = resolveAccumulator(config, "chunk");
        const doneAccumulator = resolveAccumulator(config, "done");

        const prev = { id: "1", text: "hello" };
        const curr = { text: " world" };

        expect(chunkAccumulator(prev, curr)).toEqual({
          id: "1",
          text: "hello world",
        });
        expect(doneAccumulator).toBe(replaceAccumulate);
      });

      it("should handle multiple field configs", () => {
        const config = {
          chunk: { text: "merge" as const, tokens: "merge" as const },
        };
        const accumulator = resolveAccumulator(config, "chunk");

        const prev = { id: "1", text: "hello", tokens: "5" };
        const curr = { text: " world", tokens: "3" };
        const result = accumulator(prev, curr);

        expect(result).toEqual({ id: "1", text: "hello world", tokens: "53" });
      });

      it("should handle undefined previous value", () => {
        const config = {
          chunk: { text: "merge" as const },
        };
        const accumulator = resolveAccumulator(config, "chunk");

        const curr = { id: "1", text: "hello" };
        const result = accumulator(undefined, curr);

        expect(result).toEqual({ id: "1", text: "hello" });
      });

      it("should return current if not an object", () => {
        const config = {
          chunk: { text: "merge" as const },
        };
        const accumulator = resolveAccumulator(config, "chunk");

        expect(accumulator("prev", "curr")).toBe("curr");
        expect(accumulator(123, 456)).toBe(456);
      });
    });
  });
});
