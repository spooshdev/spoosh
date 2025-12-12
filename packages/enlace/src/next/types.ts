export { type EnlaceOptions, type EnlaceCallbacks } from "enlace-core";
import type { EnlaceCallbacks, EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  EnlaceHookOptions,
  QueryFn,
  ReactRequestOptionsBase,
  SelectorFn,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "../react/types";

/**
 * Handler function called after successful mutations to trigger server-side revalidation.
 * @param tags - Cache tags to revalidate
 * @param paths - URL paths to revalidate
 */
export type ServerRevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

/** Next.js-specific options (third argument for createEnlaceNext) */
export type NextOptions = Pick<
  EnlaceHookOptions,
  "autoGenerateTags" | "autoRevalidateTags"
> &
  EnlaceCallbacks & {
    /**
     * Handler called after successful mutations to trigger server-side revalidation.
     * Receives auto-generated or manually specified tags and paths.
     * @example
     * ```ts
     * createEnlaceNext("http://localhost:3000/api/", {}, {
     *   serverRevalidator: (tags, paths) => revalidateServerAction(tags, paths)
     * });
     * ```
     */
    serverRevalidator?: ServerRevalidateHandler;

    /**
     * Skip server-side revalidation by default for all mutations.
     * Individual requests can override with serverRevalidate: true.
     * Useful for CSR-heavy apps where server cache invalidation is rarely needed.
     * @default false
     */
    skipServerRevalidation?: boolean;
  };

/** Next.js hook options (third argument for createEnlaceHookNext) - extends React's EnlaceHookOptions */
export type NextHookOptions = EnlaceHookOptions &
  Pick<NextOptions, "serverRevalidator" | "skipServerRevalidation">;

/** Per-request options for Next.js fetch - extends React's base options */
export type NextRequestOptionsBase = ReactRequestOptionsBase & {
  /** Time in seconds to revalidate, or false to disable */
  revalidate?: number | false;

  /**
   * URL paths to revalidate after mutation.
   * Passed to the serverRevalidator handler.
   */
  revalidatePaths?: string[];

  /**
   * Control server-side revalidation for this specific request.
   * - true: Force server revalidation
   * - false: Skip server revalidation
   * When undefined, follows the global skipServerRevalidation setting.
   */
  serverRevalidate?: boolean;
};

// ============================================================================
// Next.js Hook Types
// ============================================================================

export type NextApiClient<TSchema, TDefaultError = unknown> =
  ApiClient<TSchema, TDefaultError, NextRequestOptionsBase>;

export type NextQueryFn<TSchema, TData, TError, TDefaultError = unknown> = QueryFn<
  TSchema,
  TData,
  TError,
  TDefaultError,
  NextRequestOptionsBase
>;

export type NextSelectorFn<TSchema, TMethod, TDefaultError = unknown> = SelectorFn<
  TSchema,
  TMethod,
  TDefaultError,
  NextRequestOptionsBase
>;

/** Hook type returned by createEnlaceHookNext */
export type NextEnlaceHook<TSchema, TDefaultError = unknown> = {
  <
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selector: NextSelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod>;

  <TData, TError>(
    queryFn: NextQueryFn<TSchema, TData, TError, TDefaultError>,
    options?: UseEnlaceQueryOptions
  ): UseEnlaceQueryResult<TData, TError>;
};
