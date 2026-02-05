import { createMockContext } from "@spoosh/test-utils";

import { progressPlugin } from "./plugin";

describe("progressPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = progressPlugin();
      expect(plugin.name).toBe("spoosh:progress");
    });

    it("should operate on read, write, and infiniteRead operations", () => {
      const plugin = progressPlugin();
      expect(plugin.operations).toEqual(["read", "write", "infiniteRead"]);
    });
  });

  describe("when progress is disabled", () => {
    it("should call next() without modifying requestOptions", async () => {
      const plugin = progressPlugin();
      const context = createMockContext();
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(context.requestOptions.transport).toBeUndefined();
      expect(context.requestOptions.transportOptions).toBeUndefined();
    });

    it("should pass through when pluginOptions is undefined", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({ pluginOptions: undefined });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(context.requestOptions.transport).toBeUndefined();
    });

    it("should pass through when progress is false", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: false },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(context.requestOptions.transport).toBeUndefined();
    });
  });

  describe("when progress is enabled", () => {
    it("should set transport to xhr", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transport).toBe("xhr");
    });

    it("should set transportOptions with onProgress callback", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transportOptions).toBeDefined();
      expect(
        (context.requestOptions.transportOptions as { onProgress: unknown })
          .onProgress
      ).toBeTypeOf("function");
    });

    it("should call next() after setting transport options", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });

    it("should preserve existing requestOptions", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
        requestOptions: { headers: { "X-Custom": "value" } },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.headers).toEqual({ "X-Custom": "value" });
      expect(context.requestOptions.transport).toBe("xhr");
    });
  });

  describe("onProgress callback", () => {
    it("should call stateManager.setMeta with progress info when lengthComputable", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const setMetaSpy = vi.spyOn(context.stateManager, "setMeta");
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const { onProgress } = context.requestOptions.transportOptions as {
        onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
      };

      const mockXhr = {} as XMLHttpRequest;

      onProgress(
        {
          lengthComputable: true,
          loaded: 500,
          total: 1000,
        } as ProgressEvent,
        mockXhr
      );

      expect(setMetaSpy).toHaveBeenCalledWith(context.queryKey, {
        progress: {
          loaded: 500,
          total: 1000,
        },
      });
    });

    it("should set total to 0 when not lengthComputable", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const setMetaSpy = vi.spyOn(context.stateManager, "setMeta");
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const { onProgress } = context.requestOptions.transportOptions as {
        onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
      };

      const mockXhr = {} as XMLHttpRequest;

      onProgress(
        {
          lengthComputable: false,
          loaded: 500,
          total: 0,
        } as ProgressEvent,
        mockXhr
      );

      expect(setMetaSpy).toHaveBeenCalledWith(context.queryKey, {
        progress: {
          loaded: 500,
          total: 0,
        },
      });
    });
  });

  describe("when progress is an object", () => {
    it("should set transport to xhr", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: { totalHeader: "x-content-length" } },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transport).toBe("xhr");
    });

    it("should set transportOptions with onProgress callback", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: { totalHeader: "x-content-length" } },
      });
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transportOptions).toBeDefined();
      expect(
        (context.requestOptions.transportOptions as { onProgress: unknown })
          .onProgress
      ).toBeTypeOf("function");
    });
  });

  describe("totalHeader option", () => {
    it("should read header from xhr when lengthComputable is false and totalHeader is set", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: { totalHeader: "x-content-length" } },
      });
      const setMetaSpy = vi.spyOn(context.stateManager, "setMeta");
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const { onProgress } = context.requestOptions.transportOptions as {
        onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
      };

      const mockXhr = {
        getResponseHeader: vi.fn().mockReturnValue("2000"),
      } as unknown as XMLHttpRequest;

      onProgress(
        {
          lengthComputable: false,
          loaded: 500,
          total: 0,
        } as ProgressEvent,
        mockXhr
      );

      expect(mockXhr.getResponseHeader).toHaveBeenCalledWith(
        "x-content-length"
      );
      expect(setMetaSpy).toHaveBeenCalledWith(context.queryKey, {
        progress: {
          loaded: 500,
          total: 2000,
        },
      });
    });

    it("should fall through with event.total when totalHeader is not set", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: true },
      });
      const setMetaSpy = vi.spyOn(context.stateManager, "setMeta");
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const { onProgress } = context.requestOptions.transportOptions as {
        onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
      };

      const mockXhr = {
        getResponseHeader: vi.fn(),
      } as unknown as XMLHttpRequest;

      onProgress(
        {
          lengthComputable: false,
          loaded: 500,
          total: 0,
        } as ProgressEvent,
        mockXhr
      );

      expect(mockXhr.getResponseHeader).not.toHaveBeenCalled();
      expect(setMetaSpy).toHaveBeenCalledWith(context.queryKey, {
        progress: {
          loaded: 500,
          total: 0,
        },
      });
    });

    it("should fall through with event.total when totalHeader returns null", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        pluginOptions: { progress: { totalHeader: "x-content-length" } },
      });
      const setMetaSpy = vi.spyOn(context.stateManager, "setMeta");
      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context, next);

      const { onProgress } = context.requestOptions.transportOptions as {
        onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => void;
      };

      const mockXhr = {
        getResponseHeader: vi.fn().mockReturnValue(null),
      } as unknown as XMLHttpRequest;

      onProgress(
        {
          lengthComputable: false,
          loaded: 500,
          total: 0,
        } as ProgressEvent,
        mockXhr
      );

      expect(mockXhr.getResponseHeader).toHaveBeenCalledWith(
        "x-content-length"
      );
      expect(setMetaSpy).toHaveBeenCalledWith(context.queryKey, {
        progress: {
          loaded: 500,
          total: 0,
        },
      });
    });
  });

  describe("write operations", () => {
    it("should set xhr transport for write operations with progress", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        operationType: "write",
        method: "POST",
        pluginOptions: { progress: true },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 201 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transport).toBe("xhr");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("infiniteRead operations", () => {
    it("should set xhr transport for infiniteRead operations with progress", async () => {
      const plugin = progressPlugin();
      const context = createMockContext({
        operationType: "infiniteRead",
        pluginOptions: { progress: true },
      });
      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [] }, status: 200 });

      await plugin.middleware!(context, next);

      expect(context.requestOptions.transport).toBe("xhr");
      expect(next).toHaveBeenCalled();
    });
  });
});
