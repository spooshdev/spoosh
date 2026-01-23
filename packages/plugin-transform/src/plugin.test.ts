import {
  createMockContext,
  createStateManager,
  createState,
} from "@spoosh/test-utils";

import { transformPlugin } from "./plugin";

describe("transformPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = transformPlugin();
      expect(plugin.name).toBe("spoosh:transform");
    });

    it("should operate on read, write, and infiniteRead operations", () => {
      const plugin = transformPlugin();
      expect(plugin.operations).toEqual(["read", "write", "infiniteRead"]);
    });
  });

  describe("query transformation", () => {
    it("should transform query with sync function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { category: "all", page: 1 },
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => {
              const query = q as Record<string, unknown>;
              if (query.category === "all") {
                delete query.category;
              }
              return query;
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.query).toEqual({ page: 1 });
    });

    it("should transform query with async function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { page: 1 },
        },
        pluginOptions: {
          transform: {
            query: async (q: unknown) => {
              await Promise.resolve();
              return { ...(q as Record<string, unknown>), timestamp: 123 };
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.query).toEqual({ page: 1, timestamp: 123 });
    });

    it("should remove query when transformer returns undefined", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { page: 1 },
        },
        pluginOptions: {
          transform: {
            query: () => undefined,
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.query).toBeUndefined();
    });

    it("should not mutate original query object", async () => {
      const originalQuery = { category: "all", page: 1 };
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: originalQuery,
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => {
              const query = q as Record<string, unknown>;
              delete query.category;
              return query;
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(originalQuery).toEqual({ category: "all", page: 1 });
    });
  });

  describe("body transformation", () => {
    it("should transform body with sync function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          body: { name: "test" },
        },
        pluginOptions: {
          transform: {
            body: (b: unknown) => ({
              ...(b as Record<string, unknown>),
              version: "1.0",
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.body).toEqual({
        name: "test",
        version: "1.0",
      });
    });

    it("should transform body with async function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          body: { data: "value" },
        },
        pluginOptions: {
          transform: {
            body: async (b: unknown) => {
              const token = await Promise.resolve("secret-token");
              return { ...(b as Record<string, unknown>), token };
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.body).toEqual({
        data: "value",
        token: "secret-token",
      });
    });

    it("should not mutate original body object", async () => {
      const originalBody = { name: "test" };
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          body: originalBody,
        },
        pluginOptions: {
          transform: {
            body: (b: unknown) => {
              const body = b as Record<string, unknown>;
              body.modified = true;
              return body;
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(originalBody).toEqual({ name: "test" });
    });
  });

  describe("formData transformation", () => {
    it("should transform formData with sync function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          formData: { file: "data" },
        },
        pluginOptions: {
          transform: {
            formData: (fd: unknown) => ({
              ...(fd as Record<string, unknown>),
              source: "web",
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.formData).toEqual({
        file: "data",
        source: "web",
      });
    });

    it("should not mutate original formData object", async () => {
      const originalFormData = { file: "data" };
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          formData: originalFormData,
        },
        pluginOptions: {
          transform: {
            formData: (fd: unknown) => {
              const formData = fd as Record<string, unknown>;
              formData.modified = true;
              return formData;
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(originalFormData).toEqual({ file: "data" });
    });
  });

  describe("urlEncoded transformation", () => {
    it("should transform urlEncoded with sync function", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          urlEncoded: { client_id: "abc" },
        },
        pluginOptions: {
          transform: {
            urlEncoded: (ue: unknown) => ({
              ...(ue as Record<string, unknown>),
              grant_type: "client_credentials",
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.urlEncoded).toEqual({
        client_id: "abc",
        grant_type: "client_credentials",
      });
    });

    it("should not mutate original urlEncoded object", async () => {
      const originalUrlEncoded = { client_id: "abc" };
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          urlEncoded: originalUrlEncoded,
        },
        pluginOptions: {
          transform: {
            urlEncoded: (ue: unknown) => {
              const urlEncoded = ue as Record<string, unknown>;
              urlEncoded.modified = true;
              return urlEncoded;
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(originalUrlEncoded).toEqual({ client_id: "abc" });
    });
  });

  describe("response transformation (onResponse)", () => {
    it("should store transformedData in plugin result with sync function", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: {
            response: (r: unknown) => {
              const response = r as { items: unknown[] };
              return {
                count: response.items.length,
                processed: true,
              };
            },
          },
        },
      });
      const response = { data: { items: [{ id: 1 }, { id: 2 }] }, status: 200 };

      await plugin.onResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        count: 2,
        processed: true,
      });
    });

    it("should store transformedData in plugin result with async function", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: {
            response: async (r: unknown) => {
              const response = r as { value: number };
              const multiplier = await Promise.resolve(2);
              return { doubled: response.value * multiplier };
            },
          },
        },
      });
      const response = { data: { value: 5 }, status: 200 };

      await plugin.onResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        doubled: 10,
      });
    });

    it("should preserve original response data (not mutate it)", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: {
            response: (r: unknown) => {
              const response = r as { items: unknown[] };
              return { count: response.items.length };
            },
          },
        },
      });
      const originalData = { items: [{ id: 1 }, { id: 2 }] };
      const response = { data: originalData, status: 200 };

      await plugin.onResponse!(context, response);

      expect(response.data).toEqual({ items: [{ id: 1 }, { id: 2 }] });
    });

    it("should not call transformer when data is undefined", async () => {
      const transformer = vi.fn();
      const plugin = transformPlugin();
      const context = createMockContext({
        pluginOptions: {
          transform: {
            response: transformer,
          },
        },
      });
      const response = { error: { message: "Not found" }, status: 404 };

      await plugin.onResponse!(context, response);

      expect(transformer).not.toHaveBeenCalled();
    });

    it("should allow transformer to return completely different type", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: {
            response: (r: unknown) => {
              const response = r as { items: { id: number }[] };
              return {
                ids: response.items.map((i) => i.id),
                total: response.items.length,
                hasMore: response.items.length >= 10,
              };
            },
          },
        },
      });
      const response = {
        data: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        status: 200,
      };

      await plugin.onResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        ids: [1, 2, 3],
        total: 3,
        hasMore: false,
      });
    });

    it("should not store transformedData when no response transformer provided", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({ stateManager, queryKey });
      const response = { data: { items: [{ id: 1 }] }, status: 200 };

      await plugin.onResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toBeUndefined();
    });
  });

  describe("multiple transformations", () => {
    it("should apply all request transformations in middleware", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { page: 1 },
          body: { data: "test" },
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => ({
              ...(q as Record<string, unknown>),
              queryTransformed: true,
            }),
            body: (b: unknown) => ({
              ...(b as Record<string, unknown>),
              bodyTransformed: true,
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.query).toEqual({
        page: 1,
        queryTransformed: true,
      });
      expect(context.requestOptions.body).toEqual({
        data: "test",
        bodyTransformed: true,
      });
    });

    it("should store transformedData via response transformer in onResponse", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: {
            response: (r: unknown) => ({
              ...(r as Record<string, unknown>),
              responseTransformed: true,
            }),
          },
        },
      });
      const response = { data: { result: "success" }, status: 200 };

      await plugin.onResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        result: "success",
        responseTransformed: true,
      });
    });
  });

  describe("edge cases", () => {
    it("should skip transformation when data is not present", async () => {
      const queryTransformer = vi.fn();
      const bodyTransformer = vi.fn();
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {},
        pluginOptions: {
          transform: {
            query: queryTransformer,
            body: bodyTransformer,
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(queryTransformer).not.toHaveBeenCalled();
      expect(bodyTransformer).not.toHaveBeenCalled();
    });

    it("should call next() and return its result when no transformers", async () => {
      const plugin = transformPlugin();
      const context = createMockContext();
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should preserve other requestOptions", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { page: 1 },
          headers: { "X-Custom": "value" },
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => ({
              ...(q as Record<string, unknown>),
              transformed: true,
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.headers).toEqual({ "X-Custom": "value" });
    });

    it("should handle null values in data", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: null as unknown as Record<string, string>,
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => q,
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("write operations", () => {
    it("should transform body in write operations", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        operationType: "write",
        method: "POST",
        requestOptions: {
          body: { name: "new item" },
        },
        pluginOptions: {
          transform: {
            body: (b: unknown) => ({
              ...(b as Record<string, unknown>),
              createdAt: 123,
            }),
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 201 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.body).toEqual({
        name: "new item",
        createdAt: 123,
      });
    });
  });

  describe("infiniteRead operations", () => {
    it("should transform query in infiniteRead operations", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        operationType: "infiniteRead",
        requestOptions: {
          query: { cursor: "abc" },
        },
        pluginOptions: {
          transform: {
            query: (q: unknown) => ({
              ...(q as Record<string, unknown>),
              infinite: true,
            }),
          },
        },
      });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.query).toEqual({
        cursor: "abc",
        infinite: true,
      });
    });
  });

  describe("error handling", () => {
    it("should propagate transformer errors", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          query: { page: 1 },
        },
        pluginOptions: {
          transform: {
            query: () => {
              throw new Error("Transform error");
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await expect(plugin.middleware!(context, next)).rejects.toThrow(
        "Transform error"
      );
    });

    it("should propagate async transformer errors", async () => {
      const plugin = transformPlugin();
      const context = createMockContext({
        requestOptions: {
          body: { data: "test" },
        },
        pluginOptions: {
          transform: {
            body: async () => {
              await Promise.resolve();
              throw new Error("Async transform error");
            },
          },
        },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await expect(plugin.middleware!(context, next)).rejects.toThrow(
        "Async transform error"
      );
    });
  });
});
