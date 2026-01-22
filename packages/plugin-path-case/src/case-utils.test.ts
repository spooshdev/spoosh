import {
  camelToKebab,
  camelToSnake,
  camelToPascal,
  camelToTargetCase,
} from "./case-utils";

describe("case-utils", () => {
  describe("camelToKebab", () => {
    it("should convert camelCase to kebab-case", () => {
      expect(camelToKebab("helloWorld")).toBe("hello-world");
    });

    it("should handle multiple uppercase letters", () => {
      expect(camelToKebab("blogPostComments")).toBe("blog-post-comments");
    });

    it("should handle single word", () => {
      expect(camelToKebab("hello")).toBe("hello");
    });

    it("should handle already lowercase", () => {
      expect(camelToKebab("hello")).toBe("hello");
    });

    it("should handle numbers in string", () => {
      expect(camelToKebab("user123Data")).toBe("user123-data");
    });

    it("should handle consecutive numbers", () => {
      expect(camelToKebab("v2Api")).toBe("v2-api");
    });

    it("should handle empty string", () => {
      expect(camelToKebab("")).toBe("");
    });
  });

  describe("camelToSnake", () => {
    it("should convert camelCase to snake_case", () => {
      expect(camelToSnake("helloWorld")).toBe("hello_world");
    });

    it("should handle multiple uppercase letters", () => {
      expect(camelToSnake("blogPostComments")).toBe("blog_post_comments");
    });

    it("should handle single word", () => {
      expect(camelToSnake("hello")).toBe("hello");
    });

    it("should handle numbers in string", () => {
      expect(camelToSnake("user123Data")).toBe("user123_data");
    });

    it("should handle empty string", () => {
      expect(camelToSnake("")).toBe("");
    });
  });

  describe("camelToPascal", () => {
    it("should convert camelCase to PascalCase", () => {
      expect(camelToPascal("helloWorld")).toBe("HelloWorld");
    });

    it("should handle single word", () => {
      expect(camelToPascal("hello")).toBe("Hello");
    });

    it("should handle already PascalCase", () => {
      expect(camelToPascal("HelloWorld")).toBe("HelloWorld");
    });

    it("should handle empty string", () => {
      expect(camelToPascal("")).toBe("");
    });
  });

  describe("camelToTargetCase", () => {
    it("should convert to kebab case", () => {
      expect(camelToTargetCase("helloWorld", "kebab")).toBe("hello-world");
    });

    it("should convert to snake case", () => {
      expect(camelToTargetCase("helloWorld", "snake")).toBe("hello_world");
    });

    it("should convert to pascal case", () => {
      expect(camelToTargetCase("helloWorld", "pascal")).toBe("HelloWorld");
    });

    it("should return unchanged for camel case", () => {
      expect(camelToTargetCase("helloWorld", "camel")).toBe("helloWorld");
    });
  });
});
