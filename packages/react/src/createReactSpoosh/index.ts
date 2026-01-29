import type { PluginArray } from "@spoosh/core";
import { createUseRead } from "../useRead";
import { createUseWrite } from "../useWrite";
import { createUseInfiniteRead } from "../useInfiniteRead";
import type { SpooshReactHooks, SpooshInstanceShape } from "./types";

/**
 * Creates React hooks (useRead, useWrite, useInfiniteRead) from a Spoosh instance.
 *
 * @template TSchema - The API schema type
 * @template TDefaultError - The default error type
 * @template TPlugins - The plugins array type
 * @template TApi - The API client type
 * @param instance - The Spoosh instance containing api, stateManager, eventEmitter, and pluginExecutor
 * @returns An object containing useRead, useWrite, useInfiniteRead hooks and plugin instance APIs
 *
 * @example
 * ```ts
 * const { useRead, useWrite, useInfiniteRead } = createReactSpoosh(spooshInstance);
 *
 * function MyComponent() {
 *   const { data, loading } = useRead((api) => api("posts").GET());
 *   return <div>{loading ? 'Loading...' : data?.title}</div>;
 * }
 * ```
 */
export function createReactSpoosh<
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
  TApi,
>(
  instance: SpooshInstanceShape<TApi, TSchema, TDefaultError, TPlugins>
): SpooshReactHooks<TDefaultError, TSchema, TPlugins> {
  const { api, stateManager, eventEmitter, pluginExecutor } = instance;

  const useRead = createUseRead<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  const useWrite = createUseWrite<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  const useInfiniteRead = createUseInfiniteRead<
    TSchema,
    TDefaultError,
    TPlugins
  >({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  });

  const instanceApiContext = {
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  };
  const plugins = pluginExecutor.getPlugins();

  const instanceApis = plugins.reduce(
    (acc, plugin) => {
      if (plugin.instanceApi) {
        return { ...acc, ...plugin.instanceApi(instanceApiContext) };
      }
      return acc;
    },
    {} as Record<string, unknown>
  );

  return {
    useRead,
    useWrite,
    useInfiniteRead,
    ...instanceApis,
  } as SpooshReactHooks<TDefaultError, TSchema, TPlugins>;
}

export * from "./types";
