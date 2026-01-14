import { buildUrl } from "./buildUrl";

describe("buildUrl", () => {
  describe("basic URL with path segments", () => {
    it("should build URL with single path segment", () => {
      const result = buildUrl("api", ["users"]);
      expect(result).toBe("/api/users");
    });

    it("should build URL with multiple path segments", () => {
      const result = buildUrl("api", ["users", "123", "posts"]);
      expect(result).toBe("/api/users/123/posts");
    });
  });

  describe("absolute URLs", () => {
    it("should handle https:// URLs", () => {
      const result = buildUrl("https://example.com", ["api", "users"]);
      expect(result).toBe("https://example.com/api/users");
    });

    it("should handle http:// URLs", () => {
      const result = buildUrl("http://example.com", ["api", "users"]);
      expect(result).toBe("http://example.com/api/users");
    });

    it("should handle absolute URL with trailing slash", () => {
      const result = buildUrl("https://example.com/", ["api", "users"]);
      expect(result).toBe("https://example.com/api/users");
    });

    it("should handle absolute URL without trailing slash", () => {
      const result = buildUrl("https://example.com", ["api"]);
      expect(result).toBe("https://example.com/api");
    });

    it("should handle absolute URL with port", () => {
      const result = buildUrl("https://example.com:8080", ["api", "users"]);
      expect(result).toBe("https://example.com:8080/api/users");
    });
  });

  describe("relative paths", () => {
    it("should handle relative base without leading slash", () => {
      const result = buildUrl("api", ["users"]);
      expect(result).toBe("/api/users");
    });

    it("should handle relative base with leading slash", () => {
      const result = buildUrl("/api", ["users"]);
      expect(result).toBe("/api/users");
    });

    it("should handle nested relative base", () => {
      const result = buildUrl("v1/api", ["users", "posts"]);
      expect(result).toBe("/v1/api/users/posts");
    });
  });

  describe("query parameters", () => {
    it("should handle string query parameter", () => {
      const result = buildUrl("api", ["users"], { name: "john" });
      expect(result).toBe("/api/users?name=john");
    });

    it("should handle number query parameter", () => {
      const result = buildUrl("api", ["users"], { page: 1 });
      expect(result).toBe("/api/users?page=1");
    });

    it("should handle boolean query parameter", () => {
      const result = buildUrl("api", ["users"], { active: true });
      expect(result).toBe("/api/users?active=true");
    });

    it("should handle multiple query parameters", () => {
      const result = buildUrl("api", ["users"], {
        page: 1,
        limit: 10,
        active: true,
      });
      expect(result).toBe("/api/users?page=1&limit=10&active=true");
    });

    it("should handle query parameters with absolute URL", () => {
      const result = buildUrl("https://example.com", ["api", "users"], {
        page: 1,
      });
      expect(result).toBe("https://example.com/api/users?page=1");
    });
  });

  describe("undefined/null query values", () => {
    it("should skip undefined query values", () => {
      const result = buildUrl("api", ["users"], {
        name: "john",
        age: undefined,
      });
      expect(result).toBe("/api/users?name=john");
    });

    it("should skip all undefined values", () => {
      const result = buildUrl("api", ["users"], {
        name: undefined,
        age: undefined,
      });
      expect(result).toBe("/api/users");
    });

    it("should handle mixed defined and undefined values", () => {
      const result = buildUrl("api", ["users"], {
        page: 1,
        filter: undefined,
        active: true,
      });
      expect(result).toBe("/api/users?page=1&active=true");
    });

    it("should skip undefined query values with absolute URL", () => {
      const result = buildUrl("https://example.com", ["api"], {
        id: 123,
        name: undefined,
      });
      expect(result).toBe("https://example.com/api?id=123");
    });
  });

  describe("empty path array", () => {
    it("should handle empty path array with relative base", () => {
      const result = buildUrl("api", []);
      expect(result).toBe("/api");
    });

    it("should handle empty path array with absolute URL", () => {
      const result = buildUrl("https://example.com", []);
      expect(result).toBe("https://example.com/");
    });

    it("should handle empty path array with query params", () => {
      const result = buildUrl("api", [], { page: 1 });
      expect(result).toBe("/api?page=1");
    });
  });

  describe("trailing/leading slashes handling", () => {
    it("should normalize base with trailing slash", () => {
      const result = buildUrl("api/", ["users"]);
      expect(result).toBe("/api/users");
    });

    it("should normalize base with leading and trailing slashes", () => {
      const result = buildUrl("/api/", ["users"]);
      expect(result).toBe("/api/users");
    });

    it("should handle absolute URL trailing slash normalization", () => {
      const result = buildUrl("https://example.com/", ["users"]);
      expect(result).toBe("https://example.com/users");
    });

    it("should handle absolute URL without trailing slash", () => {
      const result = buildUrl("https://example.com", ["users"]);
      expect(result).toBe("https://example.com/users");
    });
  });

  describe("URL encoding of special characters", () => {
    it("should encode spaces in query values", () => {
      const result = buildUrl("api", ["users"], { name: "john doe" });
      expect(result).toBe("/api/users?name=john%20doe");
    });

    it("should encode ampersand in query values", () => {
      const result = buildUrl("api", ["users"], { company: "A&B" });
      expect(result).toBe("/api/users?company=A%26B");
    });

    it("should encode equals sign in query values", () => {
      const result = buildUrl("api", ["users"], { equation: "1+1=2" });
      expect(result).toBe("/api/users?equation=1%2B1%3D2");
    });

    it("should encode special characters with absolute URL", () => {
      const result = buildUrl("https://example.com", ["api"], {
        search: "hello world",
      });
      expect(result).toBe("https://example.com/api?search=hello%20world");
    });

    it("should encode unicode characters in query values", () => {
      const result = buildUrl("api", ["users"], { name: "日本語" });
      expect(result).toBe("/api/users?name=%E6%97%A5%E6%9C%AC%E8%AA%9E");
    });

    it("should encode question mark in query values", () => {
      const result = buildUrl("api", ["search"], { q: "what?" });
      expect(result).toBe("/api/search?q=what%3F");
    });

    it("should encode hash in query values", () => {
      const result = buildUrl("api", ["tags"], { tag: "#trending" });
      expect(result).toBe("/api/tags?tag=%23trending");
    });

    it("should encode slash in query values", () => {
      const result = buildUrl("api", ["files"], { path: "foo/bar" });
      expect(result).toBe("/api/files?path=foo%2Fbar");
    });

    it("should encode special characters in query keys", () => {
      const result = buildUrl("api", ["data"], { "user name": "john" });
      expect(result).toBe("/api/data?user%20name=john");
    });

    it("should encode multiple special characters", () => {
      const result = buildUrl("api", ["search"], { q: "a & b = c" });
      expect(result).toBe("/api/search?q=a%20%26%20b%20%3D%20c");
    });

    it("should encode percent sign in query values", () => {
      const result = buildUrl("api", ["stats"], { rate: "50%" });
      expect(result).toBe("/api/stats?rate=50%25");
    });
  });
});
