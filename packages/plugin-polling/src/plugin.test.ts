import {
  createMockContext,
  createMockResponse,
  createStateManager,
  createEventEmitter,
} from "@spoosh/test-utils";

import { pollingPlugin } from "./plugin";

describe("pollingPlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = pollingPlugin();
      expect(plugin.name).toBe("spoosh:polling");
    });

    it("should operate on read and pages operations", () => {
      const plugin = pollingPlugin();
      expect(plugin.operations).toEqual(["read", "pages"]);
    });
  });

  describe("schedules refetch after pollingInterval", () => {
    it("should schedule refetch after specified pollingInterval", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it("should not emit before pollingInterval elapses", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(4999);

      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("emits refetch event with queryKey", () => {
    it("should emit refetch event with correct queryKey and reason", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 3000 },
      });

      plugin.afterResponse!(context, createMockResponse());
      vi.advanceTimersByTime(3000);

      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["users","1"]}',
        reason: "polling",
      });
    });

    it("should emit refetch event with different queryKey", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");
      const customQueryKey = '{"method":"GET","path":["posts","42"]}';

      stateManager.setCache(customQueryKey, {
        state: {
          data: { id: 42 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: customQueryKey,
        pluginOptions: { pollingInterval: 1000 },
      });

      plugin.afterResponse!(context, createMockResponse());
      vi.advanceTimersByTime(1000);

      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: customQueryKey,
        reason: "polling",
      });
    });
  });

  describe("clears polling on unmount", () => {
    it("should clear polling timeout on unmount", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(2000);

      plugin.lifecycle!.onUnmount!(context);

      vi.advanceTimersByTime(5000);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should not throw when unmounting without active polling", () => {
      const plugin = pollingPlugin();
      const context = createMockContext();

      expect(() => plugin.lifecycle!.onUnmount!(context)).not.toThrow();
    });
  });

  describe("first-tick response data", () => {
    it("should pass response data to pollingInterval on first request with empty cache", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const pollingIntervalFn = vi.fn().mockReturnValue(5000);

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: pollingIntervalFn },
      });

      const responseData = { id: 1, name: "Test User" };

      plugin.afterResponse!(
        context,
        createMockResponse({ data: responseData })
      );

      expect(pollingIntervalFn).toHaveBeenCalledWith({
        data: responseData,
        error: undefined,
      });
    });

    it("should pass response error to pollingInterval on first request with empty cache", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const pollingIntervalFn = vi.fn().mockReturnValue(5000);

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: pollingIntervalFn },
      });

      const responseError = { message: "Not found" };

      plugin.afterResponse!(
        context,
        createMockResponse({ error: responseError, status: 404 })
      );

      expect(pollingIntervalFn).toHaveBeenCalledWith({
        data: undefined,
        error: responseError,
      });
    });
  });

  describe("dynamic pollingInterval function", () => {
    it("should call pollingInterval function with data and error", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const pollingIntervalFn = vi.fn().mockReturnValue(2000);

      const responseData = { id: 1, status: "active" };

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: pollingIntervalFn },
      });

      plugin.afterResponse!(
        context,
        createMockResponse({ data: responseData })
      );

      expect(pollingIntervalFn).toHaveBeenCalledWith({
        data: responseData,
        error: undefined,
      });
    });

    it("should use dynamic interval value from function", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: () => 7000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(6999);
      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it("should pass error to pollingInterval function when available", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const pollingIntervalFn = vi.fn().mockReturnValue(1000);

      const responseError = { message: "Request failed" };

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: pollingIntervalFn },
      });

      plugin.afterResponse!(
        context,
        createMockResponse({ error: responseError, status: 500 })
      );

      expect(pollingIntervalFn).toHaveBeenCalledWith({
        data: undefined,
        error: responseError,
      });
    });

    it("should disable polling when function returns false", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: () => false },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(10000);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should disable polling when function returns zero or negative", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: () => 0 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(10000);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe("pollingInterval: false disables polling", () => {
    it("should not schedule polling when pollingInterval is false", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: false },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(60000);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should not schedule polling when pollingInterval is undefined", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: {},
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(60000);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should not schedule polling when pluginOptions is undefined", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: undefined,
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(60000);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe("lifecycle onUpdate", () => {
    it("should clear polling when queryKey changes", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const oldQueryKey = '{"method":"GET","path":["users","1"]}';
      const newQueryKey = '{"method":"GET","path":["users","2"]}';

      stateManager.setCache(oldQueryKey, {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const oldContext = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: oldQueryKey,
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(oldContext, createMockResponse());

      vi.advanceTimersByTime(2000);

      stateManager.setCache(newQueryKey, {
        state: {
          data: { id: 2 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const newContext = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: newQueryKey,
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.lifecycle!.onUpdate!(newContext, oldContext);

      vi.advanceTimersByTime(5000);

      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: newQueryKey,
        reason: "polling",
      });

      expect(emitSpy).not.toHaveBeenCalledWith("refetch", {
        queryKey: oldQueryKey,
        reason: "polling",
      });
    });

    it("should clear polling when pollingInterval becomes falsy", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const contextWithPolling = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(contextWithPolling, createMockResponse());

      vi.advanceTimersByTime(2000);

      const contextWithoutPolling = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: false },
      });

      plugin.lifecycle!.onUpdate!(contextWithoutPolling, contextWithPolling);

      vi.advanceTimersByTime(5000);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("should schedule polling if no timeout exists and pollingInterval is set", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const contextWithoutPolling = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: {},
      });

      const contextWithPolling = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 3000 },
      });

      plugin.lifecycle!.onUpdate!(contextWithPolling, contextWithoutPolling);

      vi.advanceTimersByTime(3000);

      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: '{"method":"GET","path":["users","1"]}',
        reason: "polling",
      });
    });
  });

  describe("edge cases", () => {
    it("should clear existing timeout before scheduling new one", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(2000);

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(3000);

      expect(emitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple queries with different polling intervals", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      const queryKey1 = '{"method":"GET","path":["users","1"]}';
      const queryKey2 = '{"method":"GET","path":["posts","1"]}';

      stateManager.setCache(queryKey1, {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache(queryKey2, {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        stale: false,
      });

      const context1 = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: queryKey1,
        pluginOptions: { pollingInterval: 3000 },
      });

      const context2 = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: queryKey2,
        pluginOptions: { pollingInterval: 5000 },
      });

      plugin.afterResponse!(context1, createMockResponse());
      plugin.afterResponse!(context2, createMockResponse());

      vi.advanceTimersByTime(3000);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: queryKey1,
        reason: "polling",
      });

      vi.advanceTimersByTime(2000);

      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledWith("refetch", {
        queryKey: queryKey2,
        reason: "polling",
      });
    });

    it("should handle negative pollingInterval value", () => {
      const plugin = pollingPlugin();
      const eventEmitter = createEventEmitter();
      const stateManager = createStateManager();
      const emitSpy = vi.spyOn(eventEmitter, "emit");

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const context = createMockContext({
        eventEmitter,
        stateManager,
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { pollingInterval: -1000 },
      });

      plugin.afterResponse!(context, createMockResponse());

      vi.advanceTimersByTime(10000);

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
