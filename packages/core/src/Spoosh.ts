import { createProxyHandler } from "./proxy";
import { createStateManager } from "./state";
import { createEventEmitter } from "./events";
import { createPluginExecutor } from "./plugins";
import type { SpooshInstance, PluginArray } from "./types/instance.types";
import type { SpooshOptions } from "./types/request.types";

/**
 * Class-based builder for creating Spoosh instances with type-safe plugin inference.
 *
 * @template TSchema - The API schema type defining endpoints and their types
 * @template TError - Default error type for all requests (defaults to unknown)
 * @template TPlugins - A const tuple of plugin instances for type inference (defaults to empty array)
 *
 * @example Basic usage
 * ```ts
 * const client = new Spoosh<ApiSchema, Error>('/api')
 *   .use([cachePlugin(), retryPlugin()]);
 *
 * const { api } = client;
 * const response = await api("posts").GET();
 * ```
 *
 * @example With default options
 * ```ts
 * const client = new Spoosh<ApiSchema, Error>('/api', {
 *   headers: { 'Authorization': 'Bearer token' }
 * }).use([cachePlugin()]);
 * ```
 *
 * @example With React hooks
 * ```ts
 * import { createReactSpoosh } from '@spoosh/react';
 *
 * const client = new Spoosh<ApiSchema, Error>('/api')
 *   .use([cachePlugin(), retryPlugin()]);
 *
 * const { useRead, useWrite } = createReactSpoosh(client);
 *
 * // In component
 * const { data } = useRead((api) => api("posts").GET());
 * const { trigger } = useWrite((api) => api("posts").POST);
 * ```
 *
 * @since 0.1.0
 */
export class Spoosh<
  TSchema = unknown,
  TError = unknown,
  TPlugins extends PluginArray = [],
> {
  private baseUrl: string;
  private defaultOptions: SpooshOptions;
  private _plugins: TPlugins;

  /**
   * Creates a new Spoosh instance.
   *
   * @param baseUrl - The base URL for all API requests (e.g., '/api' or 'https://api.example.com')
   * @param defaultOptions - Optional default options applied to all requests (headers, credentials, etc.)
   * @param plugins - Internal parameter used by the `.use()` method. Do not pass directly.
   *
   * @example
   * ```ts
   * // Simple usage
   * const client = new Spoosh<ApiSchema, Error>('/api');
   *
   * // With default headers
   * const client = new Spoosh<ApiSchema, Error>('/api', {
   *   headers: { 'X-API-Key': 'secret' }
   * });
   * ```
   */
  constructor(
    baseUrl: string,
    defaultOptions?: SpooshOptions,
    plugins?: TPlugins
  ) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions || {};
    this._plugins = (plugins || []) as TPlugins;
  }

  /**
   * Adds plugins to the Spoosh instance.
   *
   * Returns a **new** Spoosh instance with updated plugin types (immutable pattern).
   * Each call to `.use()` replaces the previous plugins rather than adding to them.
   *
   * @template TNewPlugins - The const tuple type of the new plugins array
   * @param plugins - Array of plugin instances to use
   * @returns A new Spoosh instance with the specified plugins
   *
   * @example Single use() call
   * ```ts
   * const client = new Spoosh<Schema, Error>('/api')
   *   .use([cachePlugin(), retryPlugin(), debouncePlugin()]);
   * ```
   *
   * @example Chaining use() calls (replaces plugins)
   * ```ts
   * const client1 = new Spoosh<Schema, Error>('/api')
   *   .use([cachePlugin()]);
   *
   * // This replaces cachePlugin with retryPlugin
   * const client2 = client1.use([retryPlugin()]);
   * ```
   *
   * @example With plugin configuration
   * ```ts
   * const client = new Spoosh<Schema, Error>('/api').use([
   *   cachePlugin({ staleTime: 5000 }),
   *   retryPlugin({ retries: 3, retryDelay: 1000 }),
   *   prefetchPlugin(),
   * ]);
   * ```
   */
  use<const TNewPlugins extends PluginArray>(
    plugins: TNewPlugins
  ): Spoosh<TSchema, TError, TNewPlugins> {
    return new Spoosh<TSchema, TError, TNewPlugins>(
      this.baseUrl,
      this.defaultOptions,
      plugins
    );
  }

  /**
   * Cached instance of the underlying SpooshInstance.
   * Created lazily on first property access.
   * @private
   */
  private _instance?: SpooshInstance<TSchema, TError, TPlugins>;

  /**
   * Gets or creates the underlying SpooshInstance.
   * Uses lazy initialization for optimal performance.
   * @private
   */
  private getInstance(): SpooshInstance<TSchema, TError, TPlugins> {
    if (!this._instance) {
      const api = createProxyHandler({
        baseUrl: this.baseUrl,
        defaultOptions: this.defaultOptions,
      });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const pluginExecutor = createPluginExecutor([...this._plugins]);

      this._instance = {
        api,
        stateManager,
        eventEmitter,
        pluginExecutor,
        config: {
          baseUrl: this.baseUrl,
          defaultOptions: this.defaultOptions,
        },
        _types: {
          schema: undefined as unknown as TSchema,
          defaultError: undefined as unknown as TError,
          plugins: this._plugins as TPlugins,
        },
      } as SpooshInstance<TSchema, TError, TPlugins>;
    }
    return this._instance;
  }

  /**
   * The type-safe API client for making requests.
   *
   * Provides a proxy-based interface for accessing endpoints defined in your schema.
   *
   * @example
   * ```ts
   * const client = new Spoosh<ApiSchema, Error>('/api').use([...]);
   * const { api } = client;
   *
   * // GET request
   * const { data } = await api("posts").GET();
   *
   * // POST request with body
   * const { data } = await api("posts").POST({ body: { title: 'Hello' } });
   *
   * // Dynamic path parameters
   * const { data } = await api("posts/:id").GET({ params: { id: postId } });
   * ```
   */
  get api() {
    return this.getInstance().api;
  }

  /**
   * State manager for cache and state operations.
   *
   * Provides methods for managing cached data, invalidating entries, and retrieving state.
   *
   * @example
   * ```ts
   * const { stateManager } = client;
   *
   * // Get cached data
   * const cache = stateManager.getCache('posts.GET');
   *
   * // Invalidate cache by tag
   * stateManager.invalidate(['posts']);
   *
   * // Clear all cache
   * stateManager.clearCache();
   * ```
   */
  get stateManager() {
    return this.getInstance().stateManager;
  }

  /**
   * Event emitter for subscribing to refetch and invalidation events.
   *
   * Used internally by plugins and hooks to trigger re-fetches.
   *
   * @example
   * ```ts
   * const { eventEmitter } = client;
   *
   * // Subscribe to refetch events
   * eventEmitter.on('refetch', ({ queryKey, reason }) => {
   *   console.log(`Refetching ${queryKey} due to ${reason}`);
   * });
   * ```
   */
  get eventEmitter() {
    return this.getInstance().eventEmitter;
  }

  /**
   * Plugin executor that manages plugin lifecycle and middleware.
   *
   * Provides access to registered plugins and their execution context.
   *
   * @example
   * ```ts
   * const { pluginExecutor } = client;
   *
   * // Get all registered plugins
   * const plugins = pluginExecutor.getPlugins();
   *
   * // Check if a plugin is registered
   * const hasCache = plugins.some(p => p.name === 'cache');
   * ```
   */
  get pluginExecutor() {
    return this.getInstance().pluginExecutor;
  }

  /**
   * Configuration object containing baseUrl and defaultOptions.
   *
   * @example
   * ```ts
   * const { config } = client;
   * console.log(config.baseUrl); // '/api'
   * console.log(config.defaultOptions); // { headers: {...} }
   * ```
   */
  get config() {
    return this.getInstance().config;
  }

  /**
   * Type information carrier for generic type inference.
   * Used internally by TypeScript for type resolution.
   *
   * @internal
   */
  get _types() {
    return this.getInstance()._types;
  }
}
