import { describe, it, expect } from "vitest";
import {
  autoParse,
  jsonDoneParse,
  jsonParse,
  numberParse,
  booleanParse,
  textParse,
  getParser,
  resolveParser,
} from "./parsers";

describe("parsers", () => {
  describe("autoParse", () => {
    it("should parse valid JSON objects", () => {
      expect(autoParse('{"key":"value"}')).toEqual({ key: "value" });
    });

    it("should parse valid JSON arrays", () => {
      expect(autoParse("[1,2,3]")).toEqual([1, 2, 3]);
    });

    it("should parse null", () => {
      expect(autoParse("null")).toBeNull();
    });

    it("should parse numbers", () => {
      expect(autoParse("42")).toBe(42);
      expect(autoParse("3.14")).toBe(3.14);
      expect(autoParse("-123")).toBe(-123);
    });

    it("should parse booleans", () => {
      expect(autoParse("true")).toBe(true);
      expect(autoParse("false")).toBe(false);
    });

    it("should fallback to string for unparseable data", () => {
      expect(autoParse("hello world")).toBe("hello world");
      expect(autoParse("not-a-number")).toBe("not-a-number");
    });

    it("should handle whitespace in numbers", () => {
      expect(autoParse("  42  ")).toBe(42);
    });
  });

  describe("jsonDoneParse", () => {
    it("should parse valid JSON", () => {
      expect(jsonDoneParse('{"key":"value"}')).toEqual({ key: "value" });
      expect(jsonDoneParse("[1,2,3]")).toEqual([1, 2, 3]);
    });

    it("should return undefined for [DONE] signal", () => {
      expect(jsonDoneParse("[DONE]")).toBeUndefined();
      expect(jsonDoneParse("[done]")).toBeUndefined();
      expect(jsonDoneParse("[Done]")).toBeUndefined();
    });

    it("should handle whitespace around [DONE]", () => {
      expect(jsonDoneParse("  [DONE]  ")).toBeUndefined();
      expect(jsonDoneParse("\n[DONE]\n")).toBeUndefined();
    });

    it("should throw on invalid JSON", () => {
      expect(() => jsonDoneParse("invalid")).toThrow();
    });
  });

  describe("jsonParse", () => {
    it("should parse valid JSON", () => {
      expect(jsonParse('{"key":"value"}')).toEqual({ key: "value" });
    });

    it("should throw on invalid JSON", () => {
      expect(() => jsonParse("invalid")).toThrow("Failed to parse JSON");
    });
  });

  describe("numberParse", () => {
    it("should parse valid numbers", () => {
      expect(numberParse("42")).toBe(42);
      expect(numberParse("3.14")).toBe(3.14);
      expect(numberParse("-123")).toBe(-123);
    });

    it("should handle whitespace", () => {
      expect(numberParse("  42  ")).toBe(42);
    });

    it("should throw on invalid numbers", () => {
      expect(() => numberParse("not-a-number")).toThrow(
        "Failed to parse number"
      );
    });
  });

  describe("booleanParse", () => {
    it("should parse true", () => {
      expect(booleanParse("true")).toBe(true);
      expect(booleanParse("TRUE")).toBe(true);
      expect(booleanParse("  true  ")).toBe(true);
    });

    it("should parse false", () => {
      expect(booleanParse("false")).toBe(false);
      expect(booleanParse("FALSE")).toBe(false);
      expect(booleanParse("  false  ")).toBe(false);
    });

    it("should throw on invalid booleans", () => {
      expect(() => booleanParse("yes")).toThrow("Failed to parse boolean");
      expect(() => booleanParse("1")).toThrow("Failed to parse boolean");
    });
  });

  describe("textParse", () => {
    it("should return input as-is", () => {
      expect(textParse("hello")).toBe("hello");
      expect(textParse("123")).toBe("123");
      expect(textParse('{"json":true}')).toBe('{"json":true}');
    });
  });

  describe("getParser", () => {
    it("should return correct parser for each strategy", () => {
      expect(getParser("auto")).toBe(autoParse);
      expect(getParser("json-done")).toBe(jsonDoneParse);
      expect(getParser("json")).toBe(jsonParse);
      expect(getParser("number")).toBe(numberParse);
      expect(getParser("boolean")).toBe(booleanParse);
      expect(getParser("text")).toBe(textParse);
    });

    it("should default to autoParse for unknown strategy", () => {
      expect(getParser("unknown" as never)).toBe(autoParse);
    });
  });

  describe("resolveParser", () => {
    it("should return autoParse when config is undefined", () => {
      expect(resolveParser(undefined, "message")).toBe(autoParse);
    });

    it("should use global strategy", () => {
      expect(resolveParser("json", "message")).toBe(jsonParse);
    });

    it("should use custom function", () => {
      const customFn = (data: string) => `custom:${data}`;
      expect(resolveParser(customFn, "message")).toBe(customFn);
    });

    it("should use per-event strategy", () => {
      const config = {
        chunk: "text" as const,
        done: "json" as const,
      };
      expect(resolveParser(config, "chunk")).toBe(textParse);
      expect(resolveParser(config, "done")).toBe(jsonParse);
    });

    it("should use per-event custom function", () => {
      const customFn = (data: string) => `custom:${data}`;
      const config = {
        chunk: customFn,
        done: "json" as const,
      };
      expect(resolveParser(config, "chunk")).toBe(customFn);
    });

    it("should fallback to autoParse for unmapped events", () => {
      const config = {
        chunk: "text" as const,
      };
      expect(resolveParser(config, "unknown")).toBe(autoParse);
    });
  });
});
