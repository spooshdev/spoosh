import type { OptimisticTarget } from "../types.js";

export type {
  CacheBuilder,
  CacheHelper,
  OptimisticCallbackFn,
} from "./types.js";

function createBuilder(state: OptimisticTarget, isConfirmed = false): unknown {
  return {
    ...state,

    // Expose the internal state so the plugin can access predicates
    __state: state,

    filter(predicate: (options: unknown) => boolean) {
      return createBuilder({ ...state, filter: predicate }, isConfirmed);
    },

    set(updater: (data: unknown, response?: unknown) => unknown) {
      if (isConfirmed) {
        return createBuilder(
          {
            ...state,
            confirmedUpdater: updater as OptimisticTarget["confirmedUpdater"],
          },
          isConfirmed
        );
      }
      return createBuilder(
        {
          ...state,
          immediateUpdater: updater as OptimisticTarget["immediateUpdater"],
        },
        isConfirmed
      );
    },

    confirmed() {
      return createBuilder(state, true);
    },

    disableRollback() {
      return createBuilder({ ...state, rollbackOnError: false }, isConfirmed);
    },

    onError(callback: (error: unknown) => void) {
      return createBuilder({ ...state, onError: callback }, isConfirmed);
    },
  };
}

export function createCacheProxy<TSchema>(): TSchema {
  return ((path: string) =>
    createBuilder({
      path,
      rollbackOnError: true,
    })) as TSchema;
}
