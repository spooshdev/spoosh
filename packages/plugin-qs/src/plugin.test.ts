import { createMockContext } from "@spoosh/test-utils";

import { qsPlugin } from "./plugin";

describe("qsPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = qsPlugin();
      expect(plugin.name).toBe("spoosh:qs");
    });

    it("should operate on read, write, infiniteRead, and queue operations", () => {
      const plugin = qsPlugin();
      expect(plugin.operations).toEqual([
        "read",
        "write",
        "infiniteRead",
        "queue",
      ]);
    });
  });

  describe("nested object serialization", () => {
    it("should serialize simple nested objects", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { pagination: { limit: 10, offset: 0 } },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "pagination[limit]": "10",
        "pagination[offset]": "0",
      });
    });

    it("should serialize deeply nested objects", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { filters: { user: { name: "john" } } },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "filters[user][name]": "john",
      });
    });

    it("should handle mixed flat and nested values", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: {
            page: 1,
            filters: { status: "active" },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        page: "1",
        "filters[status]": "active",
      });
    });
  });

  describe("array serialization", () => {
    it("should serialize arrays with brackets format by default", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { tags: ["a", "b", "c"] },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "tags[]": ["a", "b", "c"],
      });
    });

    it("should serialize arrays with indices format", async () => {
      const plugin = qsPlugin({ arrayFormat: "indices" });
      const context = createMockContext({
        request: {
          query: { tags: ["a", "b"] },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "tags[0]": "a",
        "tags[1]": "b",
      });
    });

    it("should serialize arrays with repeat format", async () => {
      const plugin = qsPlugin({ arrayFormat: "repeat" });
      const context = createMockContext({
        request: {
          query: { tags: ["a", "b"] },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        tags: ["a", "b"],
      });
    });

    it("should serialize arrays with comma format", async () => {
      const plugin = qsPlugin({ arrayFormat: "comma" });
      const context = createMockContext({
        request: {
          query: { tags: ["a", "b", "c"] },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        tags: "a,b,c",
      });
    });
  });

  describe("dot notation", () => {
    it("should use dot notation when allowDots is true", async () => {
      const plugin = qsPlugin({ allowDots: true });
      const context = createMockContext({
        request: {
          query: { filters: { status: "active" } },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "filters.status": "active",
      });
    });
  });

  describe("null handling", () => {
    it("should skip null values by default", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { name: "john", age: null },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        name: "john",
      });
    });

    it("should include null values when skipNulls is false", async () => {
      const plugin = qsPlugin({ skipNulls: false });
      const context = createMockContext({
        request: {
          query: { name: "john", age: null },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        name: "john",
        age: "",
      });
    });
  });

  describe("per-request override", () => {
    it("should override arrayFormat with request option", async () => {
      const plugin = qsPlugin({ arrayFormat: "brackets" });
      const context = createMockContext({
        request: {
          query: { tags: ["a", "b"] },
        },
        pluginOptions: { qs: { arrayFormat: "comma" } },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        tags: "a,b",
      });
    });

    it("should override allowDots with request option", async () => {
      const plugin = qsPlugin({ allowDots: false });
      const context = createMockContext({
        request: {
          query: { filters: { status: "active" } },
        },
        pluginOptions: { qs: { allowDots: true } },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "filters.status": "active",
      });
    });
  });

  describe("edge cases", () => {
    it("should skip middleware when query is undefined", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {},
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it("should skip middleware when query is empty", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: { query: {} },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it("should handle flat query without modification", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { page: 1, limit: 10 },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        page: "1",
        limit: "10",
      });
    });

    it("should call next() and return its result", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: { query: { a: 1 } },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should preserve other requestOptions", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { filters: { status: "active" } },
          headers: { "X-Custom": "value" },
          body: { data: "test" },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.headers).toEqual({ "X-Custom": "value" });
      expect(context.request.body).toEqual({ data: "test" });
    });

    it("should handle boolean values", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        request: {
          query: { active: true, deleted: false },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        active: "true",
        deleted: "false",
      });
    });
  });

  describe("write operations", () => {
    it("should serialize query in write operations", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        operationType: "write",
        method: "POST",
        request: {
          query: { filters: { type: "new" } },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 201 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "filters[type]": "new",
      });
    });
  });

  describe("infiniteRead operations", () => {
    it("should serialize query in infiniteRead operations", async () => {
      const plugin = qsPlugin();
      const context = createMockContext({
        operationType: "infiniteRead",
        request: {
          query: { pagination: { cursor: "abc123" } },
        },
      });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.request.query).toEqual({
        "pagination[cursor]": "abc123",
      });
    });
  });
});
