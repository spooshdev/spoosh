import { resolvePath, resolveTags } from "./path-utils";

describe("resolvePath", () => {
  describe("basic path parameter replacement", () => {
    it("should replace a single parameter with its value", () => {
      const path = ["users", ":id"];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "123"]);
    });

    it("should handle numeric parameter values", () => {
      const path = ["posts", ":postId"];
      const params = { postId: 456 };

      const result = resolvePath(path, params);

      expect(result).toEqual(["posts", "456"]);
    });
  });

  describe("multiple parameters", () => {
    it("should replace multiple parameters", () => {
      const path = ["users", ":userId", "posts", ":postId"];
      const params = { userId: "user-1", postId: "post-2" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "user-1", "posts", "post-2"]);
    });

    it("should handle consecutive parameters", () => {
      const path = [":category", ":subcategory", ":item"];
      const params = {
        category: "electronics",
        subcategory: "phones",
        item: "iphone",
      };

      const result = resolvePath(path, params);

      expect(result).toEqual(["electronics", "phones", "iphone"]);
    });
  });

  describe("no parameters needed", () => {
    it("should return the original path when no parameters in path", () => {
      const path = ["users", "all", "active"];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "all", "active"]);
    });

    it("should return the original path when path is empty", () => {
      const path: string[] = [];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual([]);
    });
  });

  describe("missing required parameter", () => {
    it("should throw an error when a required parameter is missing", () => {
      const path = ["users", ":id"];
      const params = { name: "test" };

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: id"
      );
    });

    it("should throw an error for the first missing parameter when multiple are missing", () => {
      const path = ["users", ":userId", "posts", ":postId"];
      const params = {};

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: userId"
      );
    });
  });

  describe("empty params object", () => {
    it("should return the original path when params is empty and no parameters in path", () => {
      const path = ["users", "list"];
      const params = {};

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "list"]);
    });

    it("should throw when params is empty but path has parameters", () => {
      const path = ["users", ":id"];
      const params = {};

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: id"
      );
    });
  });

  describe("undefined params", () => {
    it("should return the original path when params is undefined", () => {
      const path = ["users", ":id"];
      const params = undefined;

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", ":id"]);
    });

    it("should return the original path with static segments when params is undefined", () => {
      const path = ["api", "v1", "users"];
      const params = undefined;

      const result = resolvePath(path, params);

      expect(result).toEqual(["api", "v1", "users"]);
    });
  });
});

describe("resolveTags - simplified API", () => {
  const resolvedPath = ["users", "1"];

  describe("default behavior", () => {
    it("should generate single tag from path by default", () => {
      expect(resolveTags(undefined, resolvedPath)).toEqual(["users/1"]);
    });

    it("should generate single tag when tags option is undefined", () => {
      expect(resolveTags({}, resolvedPath)).toEqual(["users/1"]);
    });
  });

  describe("custom string tag", () => {
    it("should use custom string tag", () => {
      expect(resolveTags({ tags: "custom" }, resolvedPath)).toEqual(["custom"]);
    });
  });

  describe("custom array tags", () => {
    it("should use custom tags array", () => {
      expect(resolveTags({ tags: ["custom", "posts"] }, resolvedPath)).toEqual([
        "custom",
        "posts",
      ]);
    });

    it("should handle empty array", () => {
      expect(resolveTags({ tags: [] }, resolvedPath)).toEqual([]);
    });

    it("should deduplicate custom tags", () => {
      const result = resolveTags(
        { tags: ["users", "users", "posts"] },
        resolvedPath
      );
      expect(result).toEqual(["users", "posts"]);
    });
  });

  describe("edge cases", () => {
    it("should handle single segment path", () => {
      expect(resolveTags(undefined, ["posts"])).toEqual(["posts"]);
    });

    it("should handle empty path", () => {
      expect(resolveTags(undefined, [])).toEqual([]);
    });

    it("should handle long path", () => {
      const longPath = ["api", "v1", "users", "123"];
      expect(resolveTags(undefined, longPath)).toEqual(["api/v1/users/123"]);
    });
  });
});
