import type { ApiClient, TrackedCall } from "./types";
import { HTTP_METHODS } from "./types";

export type TrackingResult = {
  trackedCall: TrackedCall | null;
  selectorPath: string[] | null;
  selectorMethod: string | null;
};

export const SELECTOR_PATH_KEY = Symbol("selectorPath");

export type MethodWithPath = {
  [SELECTOR_PATH_KEY]?: string[];
};

export function createTrackingProxy<TSchema>(
  onTrack: (result: TrackingResult) => void
): ApiClient<TSchema> {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as (typeof HTTP_METHODS)[number])) {
          const methodFn = (options?: unknown) => {
            onTrack({
              trackedCall: { path, method: prop, options },
              selectorPath: null,
              selectorMethod: null,
            });

            return Promise.resolve({
              status: 200,
              data: undefined,
              error: undefined,
            });
          };
          (methodFn as unknown as MethodWithPath)[SELECTOR_PATH_KEY] = path;
          onTrack({
            trackedCall: null,
            selectorPath: path,
            selectorMethod: prop,
          });

          return methodFn;
        }

        return createProxy([...path, prop]);
      },
    });
  };

  return createProxy() as ApiClient<TSchema>;
}
