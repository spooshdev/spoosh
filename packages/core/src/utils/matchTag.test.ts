import { matchTag, matchTags } from "./matchTag";

describe("matchTag", () => {
  describe("exact matching", () => {
    it("should match exact tag", () => {
      expect(matchTag("posts", "posts")).toBe(true);
    });

    it("should not match different tag", () => {
      expect(matchTag("users", "posts")).toBe(false);
    });

    it("should not match child path with exact pattern", () => {
      expect(matchTag("posts/1", "posts")).toBe(false);
    });

    it("should not match nested child with exact pattern", () => {
      expect(matchTag("posts/1/comments", "posts")).toBe(false);
    });

    it("should match exact nested path", () => {
      expect(matchTag("posts/1/comments", "posts/1/comments")).toBe(true);
    });
  });

  describe("wildcard matching (/*)", () => {
    it("should match direct child with wildcard", () => {
      expect(matchTag("posts/1", "posts/*")).toBe(true);
    });

    it("should match nested children with wildcard", () => {
      expect(matchTag("posts/1/comments", "posts/*")).toBe(true);
    });

    it("should match deeply nested children with wildcard", () => {
      expect(matchTag("posts/1/comments/42/replies", "posts/*")).toBe(true);
    });

    it("should NOT match the parent itself with wildcard", () => {
      expect(matchTag("posts", "posts/*")).toBe(false);
    });

    it("should NOT match unrelated paths with wildcard", () => {
      expect(matchTag("users/1", "posts/*")).toBe(false);
    });

    it("should NOT match partial matches with wildcard", () => {
      expect(matchTag("posts123/1", "posts/*")).toBe(false);
    });

    it("should NOT match similar prefix without slash", () => {
      expect(matchTag("postsextra", "posts/*")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings", () => {
      expect(matchTag("", "")).toBe(true);
      expect(matchTag("posts", "")).toBe(false);
      expect(matchTag("", "posts")).toBe(false);
    });

    it("should handle numeric segments", () => {
      expect(matchTag("posts/123", "posts/*")).toBe(true);
      expect(matchTag("posts/123", "posts/123")).toBe(true);
    });

    it("should handle special characters in paths", () => {
      expect(matchTag("posts/abc-123", "posts/*")).toBe(true);
      expect(matchTag("posts/abc_123", "posts/*")).toBe(true);
    });
  });
});

describe("matchTags", () => {
  describe("basic matching", () => {
    it("should return true if any pattern matches", () => {
      expect(matchTags("posts/1", ["users", "posts/*"])).toBe(true);
    });

    it("should return false if no patterns match", () => {
      expect(matchTags("comments/1", ["users", "posts/*"])).toBe(false);
    });

    it("should return true for exact match in array", () => {
      expect(matchTags("posts", ["posts", "users"])).toBe(true);
    });
  });

  describe("combined patterns", () => {
    it("should match with combined exact and wildcard patterns", () => {
      expect(matchTags("posts", ["posts", "posts/*"])).toBe(true);
      expect(matchTags("posts/1", ["posts", "posts/*"])).toBe(true);
      expect(matchTags("posts/1/comments", ["posts", "posts/*"])).toBe(true);
    });

    it("should not match unrelated tags", () => {
      expect(matchTags("users", ["posts", "posts/*"])).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty patterns array", () => {
      expect(matchTags("posts", [])).toBe(false);
    });

    it("should handle single pattern", () => {
      expect(matchTags("posts", ["posts"])).toBe(true);
      expect(matchTags("posts/1", ["posts/*"])).toBe(true);
    });
  });
});
