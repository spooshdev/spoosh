import { createMockContext } from "@spoosh/test-utils";

import { pathCasePlugin } from "./plugin";

describe("pathCasePlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      expect(plugin.name).toBe("spoosh:path-case");
    });

    it("should operate on read, write, and infiniteRead operations", () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      expect(plugin.operations).toEqual(["read", "write", "infiniteRead"]);
    });
  });

  describe("kebab-case transformation", () => {
    it("should set path transformer for kebab-case", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({
        path: ["blogPosts", "relatedArticles"],
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer;
      expect(transformer).toBeDefined();
      expect(transformer!(["blogPosts", "relatedArticles"])).toEqual([
        "blog-posts",
        "related-articles",
      ]);
    });

    it("should transform complex paths", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(
        transformer(["userAccounts", "accountSettings", "privacyOptions"])
      ).toEqual(["user-accounts", "account-settings", "privacy-options"]);
    });
  });

  describe("snake_case transformation", () => {
    it("should set path transformer for snake_case", async () => {
      const plugin = pathCasePlugin({ targetCase: "snake" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", "relatedArticles"])).toEqual([
        "blog_posts",
        "related_articles",
      ]);
    });
  });

  describe("PascalCase transformation", () => {
    it("should set path transformer for PascalCase", async () => {
      const plugin = pathCasePlugin({ targetCase: "pascal" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", "comments"])).toEqual([
        "BlogPosts",
        "Comments",
      ]);
    });
  });

  describe("camelCase (no-op) transformation", () => {
    it("should return path unchanged for camel case", async () => {
      const plugin = pathCasePlugin({ targetCase: "camel" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", "relatedArticles"])).toEqual([
        "blogPosts",
        "relatedArticles",
      ]);
    });
  });

  describe("exclusions", () => {
    it("should skip excluded segments", async () => {
      const plugin = pathCasePlugin({
        targetCase: "kebab",
        exclude: ["v1", "api"],
      });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["api", "v1", "blogPosts"])).toEqual([
        "api",
        "v1",
        "blog-posts",
      ]);
    });

    it("should handle empty exclude list", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["api", "blogPosts"])).toEqual(["api", "blog-posts"]);
    });
  });

  describe("special segment handling", () => {
    it("should skip param placeholders starting with colon", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", ":postId", "comments"])).toEqual([
        "blog-posts",
        ":postId",
        "comments",
      ]);
    });

    it("should skip numeric segments", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", "123", "comments"])).toEqual([
        "blog-posts",
        "123",
        "comments",
      ]);
    });

    it("should skip segments that are purely numeric", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["users", "42", "posts", "999"])).toEqual([
        "users",
        "42",
        "posts",
        "999",
      ]);
    });

    it("should transform segments with numbers but not purely numeric", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["v2Api", "user123Data"])).toEqual([
        "v2-api",
        "user123-data",
      ]);
    });
  });

  describe("custom converter function", () => {
    it("should use custom converter function", async () => {
      const customConverter = vi.fn((s: string) => s.toUpperCase());
      const plugin = pathCasePlugin({ targetCase: customConverter });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", "comments"])).toEqual([
        "BLOGPOSTS",
        "COMMENTS",
      ]);
      expect(customConverter).toHaveBeenCalledWith("blogPosts");
      expect(customConverter).toHaveBeenCalledWith("comments");
    });

    it("should skip special segments even with custom converter", async () => {
      const customConverter = (s: string) => s.toUpperCase();
      const plugin = pathCasePlugin({ targetCase: customConverter });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts", ":id", "123"])).toEqual([
        "BLOGPOSTS",
        ":id",
        "123",
      ]);
    });
  });

  describe("per-request override", () => {
    it("should override target case with request option", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({
        pluginOptions: {
          pathCase: { targetCase: "snake" },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["blog_posts"]);
    });

    it("should override exclude list with request option", async () => {
      const plugin = pathCasePlugin({
        targetCase: "kebab",
        exclude: ["v1"],
      });
      const context = createMockContext({
        pluginOptions: {
          pathCase: { exclude: ["api"] },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["api", "v1", "blogPosts"])).toEqual([
        "api",
        "v1",
        "blog-posts",
      ]);
    });

    it("should use custom converter from request option", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const customConverter = (s: string) => `prefix_${s}`;
      const context = createMockContext({
        pluginOptions: {
          pathCase: { targetCase: customConverter },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["prefix_blogPosts"]);
    });
  });

  describe("middleware behavior", () => {
    it("should call next() and return its result", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should preserve existing requestOptions", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({
        requestOptions: {
          headers: { "X-Custom": "value" },
          query: { page: 1 },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.headers).toEqual({ "X-Custom": "value" });
      expect(context.requestOptions.query).toEqual({ page: 1 });
      expect(context.requestOptions._pathTransformer).toBeDefined();
    });

    it("should handle error responses", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const errorResponse = { error: { message: "Not found" }, status: 404 };
      const next = vi.fn().mockResolvedValue(errorResponse);

      const result = await plugin.middleware!(context, next);

      expect(result).toEqual(errorResponse);
    });
  });

  describe("operation types", () => {
    it("should work with read operations", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({ operationType: "read" });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions._pathTransformer).toBeDefined();
    });

    it("should work with write operations", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({
        operationType: "write",
        method: "POST",
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 201 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions._pathTransformer).toBeDefined();
    });

    it("should work with infiniteRead operations", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({ operationType: "infiniteRead" });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions._pathTransformer).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty path", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer([])).toEqual([]);
    });

    it("should handle single segment path", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["blog-posts"]);
    });

    it("should handle undefined pluginOptions", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({ pluginOptions: undefined });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["blog-posts"]);
    });

    it("should handle empty pluginOptions", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({ pluginOptions: {} });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["blog-posts"]);
    });

    it("should handle pathCase without options", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext({
        pluginOptions: { pathCase: {} },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["blogPosts"])).toEqual(["blog-posts"]);
    });

    it("should handle already lowercase segments", async () => {
      const plugin = pathCasePlugin({ targetCase: "kebab" });
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const transformer = context.requestOptions._pathTransformer!;
      expect(transformer(["users", "posts", "comments"])).toEqual([
        "users",
        "posts",
        "comments",
      ]);
    });
  });
});
