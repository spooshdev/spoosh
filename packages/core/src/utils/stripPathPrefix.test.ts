import {
  extractPrefixFromBaseUrl,
  stripPrefixFromPath,
  resolveStripPrefix,
} from "./stripPathPrefix";

describe("extractPrefixFromBaseUrl", () => {
  describe("absolute URLs", () => {
    it("should extract path from https URL", () => {
      expect(extractPrefixFromBaseUrl("https://localhost:3000/api")).toBe(
        "api"
      );
    });

    it("should extract multi-segment path from https URL", () => {
      expect(extractPrefixFromBaseUrl("https://localhost:3000/api/v1")).toBe(
        "api/v1"
      );
    });

    it("should return empty string for root path", () => {
      expect(extractPrefixFromBaseUrl("https://localhost:3000/")).toBe("");
    });

    it("should return empty string for URL without path", () => {
      expect(extractPrefixFromBaseUrl("https://localhost:3000")).toBe("");
    });

    it("should extract path from http URL", () => {
      expect(extractPrefixFromBaseUrl("http://api.example.com/v2")).toBe("v2");
    });

    it("should handle URL with query params (extracts path only)", () => {
      expect(
        extractPrefixFromBaseUrl("https://localhost:3000/api?key=value")
      ).toBe("api");
    });

    it("should treat non-http/https protocol as relative path", () => {
      expect(extractPrefixFromBaseUrl("not-a-valid-url://test")).toBe(
        "not-a-valid-url://test"
      );
    });
  });

  describe("relative paths", () => {
    it("should strip leading slash from relative path", () => {
      expect(extractPrefixFromBaseUrl("/api")).toBe("api");
    });

    it("should strip trailing slash from relative path", () => {
      expect(extractPrefixFromBaseUrl("api/")).toBe("api");
    });

    it("should strip both slashes from relative path", () => {
      expect(extractPrefixFromBaseUrl("/api/")).toBe("api");
    });

    it("should handle multi-segment relative path", () => {
      expect(extractPrefixFromBaseUrl("/api/v1")).toBe("api/v1");
    });

    it("should handle plain relative path", () => {
      expect(extractPrefixFromBaseUrl("api")).toBe("api");
    });

    it("should return empty string for root", () => {
      expect(extractPrefixFromBaseUrl("/")).toBe("");
    });

    it("should return empty string for empty string", () => {
      expect(extractPrefixFromBaseUrl("")).toBe("");
    });
  });
});

describe("stripPrefixFromPath", () => {
  describe("matching prefix", () => {
    it("should strip single segment prefix", () => {
      expect(stripPrefixFromPath(["api", "posts"], "api")).toEqual(["posts"]);
    });

    it("should strip multi-segment prefix", () => {
      expect(stripPrefixFromPath(["api", "v1", "users"], "api/v1")).toEqual([
        "users",
      ]);
    });

    it("should handle nested path after stripping", () => {
      expect(
        stripPrefixFromPath(["api", "posts", "123", "comments"], "api")
      ).toEqual(["posts", "123", "comments"]);
    });

    it("should return empty array when path equals prefix", () => {
      expect(stripPrefixFromPath(["api"], "api")).toEqual([]);
    });

    it("should strip exact multi-segment prefix match", () => {
      expect(stripPrefixFromPath(["api", "v1"], "api/v1")).toEqual([]);
    });
  });

  describe("non-matching prefix", () => {
    it("should not strip when prefix does not match", () => {
      expect(stripPrefixFromPath(["posts"], "api")).toEqual(["posts"]);
    });

    it("should not strip when path starts differently", () => {
      expect(stripPrefixFromPath(["v2", "users"], "api")).toEqual([
        "v2",
        "users",
      ]);
    });

    it("should not strip partial segment match", () => {
      expect(stripPrefixFromPath(["api-test", "users"], "api")).toEqual([
        "api-test",
        "users",
      ]);
    });

    it("should not strip when segment starts with prefix but is different word", () => {
      expect(stripPrefixFromPath(["apian", "users"], "api")).toEqual([
        "apian",
        "users",
      ]);
    });

    it("should not strip when only partial multi-segment prefix matches", () => {
      expect(
        stripPrefixFromPath(["api", "version1", "users"], "api/v1")
      ).toEqual(["api", "version1", "users"]);
    });

    it("should not strip when prefix is longer than path", () => {
      expect(stripPrefixFromPath(["api"], "api/v1")).toEqual(["api"]);
    });
  });

  describe("edge cases", () => {
    it("should return original path when prefix is empty", () => {
      expect(stripPrefixFromPath(["api", "posts"], "")).toEqual([
        "api",
        "posts",
      ]);
    });

    it("should return empty array for empty path", () => {
      expect(stripPrefixFromPath([], "api")).toEqual([]);
    });

    it("should handle prefix with leading/trailing slashes in segments", () => {
      expect(stripPrefixFromPath(["api", "v1", "users"], "/api/v1/")).toEqual([
        "users",
      ]);
    });

    it("should handle single segment path and single segment prefix match", () => {
      expect(stripPrefixFromPath(["posts"], "posts")).toEqual([]);
    });
  });
});

describe("resolveStripPrefix", () => {
  describe("boolean true - auto-detect from baseUrl", () => {
    it("should extract prefix from absolute URL", () => {
      expect(resolveStripPrefix(true, "https://localhost:3000/api")).toBe(
        "api"
      );
    });

    it("should extract multi-segment prefix from absolute URL", () => {
      expect(resolveStripPrefix(true, "https://localhost:3000/api/v1")).toBe(
        "api/v1"
      );
    });

    it("should extract prefix from relative path", () => {
      expect(resolveStripPrefix(true, "/api")).toBe("api");
    });

    it("should return empty string for URL without path", () => {
      expect(resolveStripPrefix(true, "https://api.example.com")).toBe("");
    });
  });

  describe("explicit string prefix", () => {
    it("should use explicit prefix as-is", () => {
      expect(resolveStripPrefix("api", "https://localhost:3000/api")).toBe(
        "api"
      );
    });

    it("should use explicit multi-segment prefix", () => {
      expect(resolveStripPrefix("api/v1", "https://localhost:3000/api")).toBe(
        "api/v1"
      );
    });

    it("should strip leading slash from explicit prefix", () => {
      expect(resolveStripPrefix("/api", "https://localhost:3000/api")).toBe(
        "api"
      );
    });

    it("should strip trailing slash from explicit prefix", () => {
      expect(resolveStripPrefix("api/", "https://localhost:3000/api")).toBe(
        "api"
      );
    });

    it("should strip both slashes from explicit prefix", () => {
      expect(resolveStripPrefix("/api/", "https://localhost:3000/api")).toBe(
        "api"
      );
    });
  });

  describe("falsy values - no stripping", () => {
    it("should return empty string for false", () => {
      expect(resolveStripPrefix(false, "https://localhost:3000/api")).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(resolveStripPrefix(undefined, "https://localhost:3000/api")).toBe(
        ""
      );
    });
  });

  describe("edge case table from plan", () => {
    const cases = [
      {
        baseUrl: "/api",
        schemaPath: ["api", "posts"],
        stripPathPrefix: true,
        expectedPath: ["posts"],
      },
      {
        baseUrl: "/api",
        schemaPath: ["api", "posts"],
        stripPathPrefix: "api",
        expectedPath: ["posts"],
      },
      {
        baseUrl: "/api",
        schemaPath: ["posts"],
        stripPathPrefix: true,
        expectedPath: ["posts"],
      },
      {
        baseUrl: "/api/v1",
        schemaPath: ["api", "v1", "users"],
        stripPathPrefix: true,
        expectedPath: ["users"],
      },
      {
        baseUrl: "https://api.com",
        schemaPath: ["posts"],
        stripPathPrefix: true,
        expectedPath: ["posts"],
      },
    ];

    cases.forEach(({ baseUrl, schemaPath, stripPathPrefix, expectedPath }) => {
      it(`baseUrl="${baseUrl}", path="${schemaPath.join("/")}", strip=${stripPathPrefix} → "${expectedPath.join("/")}"`, () => {
        const resolvedPrefix = resolveStripPrefix(
          stripPathPrefix as boolean | string,
          baseUrl
        );
        const result = stripPrefixFromPath(schemaPath, resolvedPrefix);
        expect(result).toEqual(expectedPath);
      });
    });
  });
});
