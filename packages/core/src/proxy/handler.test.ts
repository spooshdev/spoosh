import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProxyHandler } from "./handler";

describe("createProxyHandler", () => {
  const mockFetchExecutor = vi.fn();

  beforeEach(() => {
    mockFetchExecutor.mockReset();
    mockFetchExecutor.mockResolvedValue({ data: {}, status: 200 });
  });

  function createTestApi(config: Parameters<typeof createProxyHandler>[0]) {
    return createProxyHandler({
      ...config,
      fetchExecutor: mockFetchExecutor,
    }) as (path: string) => {
      GET: (options?: {
        params?: Record<string, string | number>;
      }) => Promise<unknown>;
      POST: (options?: {
        params?: Record<string, string | number>;
      }) => Promise<unknown>;
      PUT: (options?: {
        params?: Record<string, string | number>;
      }) => Promise<unknown>;
      PATCH: (options?: {
        params?: Record<string, string | number>;
      }) => Promise<unknown>;
      DELETE: (options?: {
        params?: Record<string, string | number>;
      }) => Promise<unknown>;
    };
  }

  describe("URL prefix stripping", () => {
    it("should strip URL prefix from path when urlPrefix is provided", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("api/posts").GET();

      expect(mockFetchExecutor).toHaveBeenCalledWith(
        "/api",
        ["posts"],
        "GET",
        {},
        undefined,
        undefined,
        ["posts"]
      );
    });

    it("should strip multi-segment URL prefix", async () => {
      const api = createTestApi({
        baseUrl: "/api/v1",
        defaultOptions: {},
        urlPrefix: "api/v1",
      });

      await api("api/v1/users/123").GET();

      expect(mockFetchExecutor).toHaveBeenCalledWith(
        "/api/v1",
        ["users", "123"],
        "GET",
        {},
        undefined,
        undefined,
        ["users", "123"]
      );
    });

    it("should not strip when path does not start with prefix", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("posts").GET();

      expect(mockFetchExecutor).toHaveBeenCalledWith(
        "/api",
        ["posts"],
        "GET",
        {},
        undefined,
        undefined,
        ["posts"]
      );
    });

    it("should not strip partial segment match (api vs apian)", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("apian/users").GET();

      expect(mockFetchExecutor).toHaveBeenCalledWith(
        "/api",
        ["apian", "users"],
        "GET",
        {},
        undefined,
        undefined,
        ["apian", "users"]
      );
    });
  });

  describe("tag prefix stripping", () => {
    it("should use urlPrefix for tags by default", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("api/posts").GET();

      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];
      expect(tagPath).toEqual(["posts"]);
    });

    it("should use explicit tagPrefix when provided", async () => {
      const api = createTestApi({
        baseUrl: "/",
        defaultOptions: {},
        urlPrefix: undefined,
        tagPrefix: "api/v1",
      });

      await api("api/v1/posts").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual(["api", "v1", "posts"]);
      expect(tagPath).toEqual(["posts"]);
    });

    it("should allow different urlPrefix and tagPrefix", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
        tagPrefix: "api/v1",
      });

      await api("api/v1/posts").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual(["v1", "posts"]);
      expect(tagPath).toEqual(["posts"]);
    });

    it("should not strip tags when tagPrefix does not match", async () => {
      const api = createTestApi({
        baseUrl: "/",
        defaultOptions: {},
        tagPrefix: "api/v1",
      });

      await api("api/v2/posts").GET();

      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];
      expect(tagPath).toEqual(["api", "v2", "posts"]);
    });

    it("should handle empty tagPrefix", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
        tagPrefix: "",
      });

      await api("api/posts").GET();

      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];
      expect(tagPath).toEqual(["api", "posts"]);
    });
  });

  describe("no prefix configuration", () => {
    it("should not strip anything when no prefixes provided", async () => {
      const api = createTestApi({
        baseUrl: "/",
        defaultOptions: {},
      });

      await api("api/v1/posts").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual(["api", "v1", "posts"]);
      expect(tagPath).toEqual(["api", "v1", "posts"]);
    });
  });

  describe("path parameter resolution", () => {
    it("should resolve path params before stripping prefix", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
        tagPrefix: "api",
      });

      await api("api/posts/:id").GET({ params: { id: "123" } });

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual(["posts", "123"]);
      expect(tagPath).toEqual(["posts", "123"]);
    });
  });

  describe("HTTP methods", () => {
    it.each(["GET", "POST", "PUT", "PATCH", "DELETE"] as const)(
      "should work with %s method",
      async (method) => {
        const api = createTestApi({
          baseUrl: "/api",
          defaultOptions: {},
          urlPrefix: "api",
        });

        await api("api/posts")[method]();

        expect(mockFetchExecutor).toHaveBeenCalledWith(
          "/api",
          ["posts"],
          method,
          {},
          undefined,
          undefined,
          ["posts"]
        );
      }
    );
  });

  describe("edge cases", () => {
    it("should handle root path", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("api").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual([]);
      expect(tagPath).toEqual([]);
    });

    it("should handle deeply nested paths", async () => {
      const api = createTestApi({
        baseUrl: "/api/v1",
        defaultOptions: {},
        urlPrefix: "api/v1",
        tagPrefix: "api/v1",
      });

      await api("api/v1/users/123/posts/456/comments").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      const tagPath = mockFetchExecutor.mock.calls[0]?.[6];

      expect(urlPath).toEqual(["users", "123", "posts", "456", "comments"]);
      expect(tagPath).toEqual(["users", "123", "posts", "456", "comments"]);
    });

    it("should handle path with trailing slash in schema", async () => {
      const api = createTestApi({
        baseUrl: "/api",
        defaultOptions: {},
        urlPrefix: "api",
      });

      await api("api/posts/").GET();

      const urlPath = mockFetchExecutor.mock.calls[0]?.[1];
      expect(urlPath).toEqual(["posts"]);
    });
  });
});

describe("createProxyHandler with nextTags", () => {
  const mockFetchExecutor = vi.fn();

  beforeEach(() => {
    mockFetchExecutor.mockReset();
    mockFetchExecutor.mockResolvedValue({ data: {}, status: 200 });
  });

  it("should pass nextTags flag to executor", async () => {
    const api = createProxyHandler({
      baseUrl: "/api",
      defaultOptions: {},
      fetchExecutor: mockFetchExecutor,
      nextTags: true,
      urlPrefix: "api",
    }) as (path: string) => { GET: () => Promise<unknown> };

    await api("api/posts").GET();

    expect(mockFetchExecutor).toHaveBeenCalledWith(
      "/api",
      ["posts"],
      "GET",
      {},
      undefined,
      true,
      ["posts"]
    );
  });
});
