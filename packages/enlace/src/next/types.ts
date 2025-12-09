export { type EnlaceOptions, type EnlaceCallbacks } from "enlace-core";
import type { EnlaceCallbacks } from "enlace-core";
import type { EnlaceHookOptions } from "../react/createEnlaceHook";
import type { ReactRequestOptionsBase } from "../react/types";

/**
 * Handler function called after successful mutations to trigger server-side revalidation.
 * @param tags - Cache tags to revalidate
 * @param paths - URL paths to revalidate
 */
export type RevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

/** Next.js-specific options (third argument for createEnlace) */
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
     * createEnlace("http://localhost:3000/api/", {}, {
     *   revalidator: (tags, paths) => revalidateServerAction(tags, paths)
     * });
     * ```
     */
    revalidator?: RevalidateHandler;
  };

/** Next.js hook options (third argument for createEnlaceHook) - extends React's EnlaceHookOptions */
export type NextHookOptions = EnlaceHookOptions &
  Pick<NextOptions, "revalidator">;

/** Per-request options for Next.js fetch - extends React's base options */
export type NextRequestOptionsBase = ReactRequestOptionsBase & {
  /** Time in seconds to revalidate, or false to disable */
  revalidate?: number | false;

  /**
   * URL paths to revalidate after mutation
   * This doesn't do anything on the client by itself - it's passed to the revalidator handler.
   * You must implement the revalidation logic in the revalidator.
   */
  revalidatePaths?: string[];

  /**
   * Skip server-side revalidation for this request.
   * Useful when autoRevalidateTags is enabled but you want to opt-out for specific mutations.
   * You can still pass empty [] to revalidateTags to skip triggering revalidation.
   * But this flag can be used if you want to revalidate client-side and skip server-side entirely.
   * Eg. you don't fetch any data on server component and you might want to skip the overhead of revalidation.
   */
  skipRevalidator?: boolean;
};
