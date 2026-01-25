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

describe("resolveTags - unified API", () => {
  const resolvedPath = ["users", "1"];

  describe("mode strings", () => {
    it('should generate full hierarchy for "all" mode', () => {
      expect(resolveTags({ tags: "all" }, resolvedPath)).toEqual([
        "users",
        "users/1",
      ]);
    });

    it('should generate only exact path for "self" mode', () => {
      expect(resolveTags({ tags: "self" }, resolvedPath)).toEqual(["users/1"]);
    });

    it('should return empty array for "none" mode', () => {
      expect(resolveTags({ tags: "none" }, resolvedPath)).toEqual([]);
    });
  });

  describe("arrays without mode keyword", () => {
    it("should use custom tags only", () => {
      expect(resolveTags({ tags: ["custom", "posts"] }, resolvedPath)).toEqual([
        "custom",
        "posts",
      ]);
    });

    it("should handle empty array", () => {
      expect(resolveTags({ tags: [] }, resolvedPath)).toEqual([]);
    });
  });

  describe("arrays with mode keyword", () => {
    it('should combine "all" mode with custom tags', () => {
      const result = resolveTags({ tags: ["all", "custom"] }, resolvedPath);
      expect(result).toContain("users");
      expect(result).toContain("users/1");
      expect(result).toContain("custom");
    });

    it('should combine "self" mode with custom tags', () => {
      const result = resolveTags({ tags: ["self", "posts"] }, resolvedPath);
      expect(result).toContain("users/1");
      expect(result).toContain("posts");
    });

    it("should handle mode keyword at any position", () => {
      const result = resolveTags(
        { tags: ["custom", "all", "posts"] },
        resolvedPath
      );
      expect(result).toContain("users");
      expect(result).toContain("users/1");
      expect(result).toContain("custom");
      expect(result).toContain("posts");
    });
  });

  describe("deduplication", () => {
    it("should deduplicate tags when mode generates duplicates", () => {
      const result = resolveTags({ tags: ["all", "users"] }, resolvedPath);
      const userCount = result.filter((t) => t === "users").length;
      expect(userCount).toBe(1);
    });
  });

  describe("default behavior", () => {
    it('should default to "all" mode when undefined', () => {
      expect(resolveTags(undefined, resolvedPath)).toEqual([
        "users",
        "users/1",
      ]);
    });

    it('should default to "all" mode when tags option is undefined', () => {
      expect(resolveTags({}, resolvedPath)).toEqual(["users", "users/1"]);
    });
  });

  describe("edge cases", () => {
    it("should handle single segment path with all mode", () => {
      expect(resolveTags({ tags: "all" }, ["posts"])).toEqual(["posts"]);
    });

    it("should handle single segment path with self mode", () => {
      expect(resolveTags({ tags: "self" }, ["posts"])).toEqual(["posts"]);
    });

    it("should handle empty path", () => {
      expect(resolveTags({ tags: "all" }, [])).toEqual([]);
    });

    it("should handle long path with all mode", () => {
      const longPath = ["api", "v1", "users", "123"];
      expect(resolveTags({ tags: "all" }, longPath)).toEqual([
        "api",
        "api/v1",
        "api/v1/users",
        "api/v1/users/123",
      ]);
    });

    it("should handle long path with self mode", () => {
      const longPath = ["api", "v1", "users", "123"];
      expect(resolveTags({ tags: "self" }, longPath)).toEqual([
        "api/v1/users/123",
      ]);
    });
  });
});
