import type { RefetchEvent } from "../plugins/types";

type EventCallback<T = unknown> = (payload: T) => void;

/**
 * Built-in event map. Maps event names to their payload types.
 *
 * Third-party plugins can extend this via declaration merging:
 * @example
 * ```ts
 * declare module '@spoosh/core' {
 *   interface BuiltInEvents {
 *     "my-custom-event": MyPayloadType;
 *   }
 * }
 * ```
 */
export interface BuiltInEvents {
  refetch: RefetchEvent;
  invalidate: string[];
  refetchAll: void;
}

/**
 * Resolves event payload type. Built-in events get their specific type,
 * custom events get `unknown` (or explicit type parameter).
 */
type EventPayload<E extends string> = E extends keyof BuiltInEvents
  ? BuiltInEvents[E]
  : unknown;

export type EventEmitter = {
  /**
   * Subscribe to an event. Built-in events have type-safe payloads.
   *
   * @example
   * ```ts
   * // Built-in event - payload is typed as RefetchEvent
   * eventEmitter.on("refetch", (event) => {
   *   console.log(event.queryKey, event.reason);
   * });
   *
   * // Custom event - specify type explicitly
   * eventEmitter.on<MyPayload>("my-event", (payload) => { ... });
   * ```
   */
  on<E extends string>(
    event: E,
    callback: EventCallback<EventPayload<E>>
  ): () => void;

  /**
   * Emit an event. Built-in events have type-safe payloads.
   *
   * @example
   * ```ts
   * // Built-in event - payload is type-checked
   * eventEmitter.emit("refetch", { queryKey: "...", reason: "focus" });
   *
   * // Custom event
   * eventEmitter.emit("my-event", myPayload);
   * ```
   */
  emit<E extends string>(event: E, payload: EventPayload<E>): void;

  off: (event: string, callback: EventCallback) => void;
  clear: () => void;
};

export function createEventEmitter(): EventEmitter {
  const listeners = new Map<string, Set<EventCallback>>();

  return {
    on<T>(event: string, callback: EventCallback<T>) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)!.add(callback as EventCallback);

      return () => {
        listeners.get(event)?.delete(callback as EventCallback);
      };
    },

    emit<T>(event: string, payload: T) {
      listeners.get(event)?.forEach((cb) => cb(payload));
    },

    off(event: string, callback: EventCallback) {
      listeners.get(event)?.delete(callback);
    },

    clear() {
      listeners.clear();
    },
  };
}
