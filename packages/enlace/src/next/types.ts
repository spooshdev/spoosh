import type { EnlaceOptions } from "enlace-core";

/**
 * Handler function called after successful mutations to trigger server-side revalidation.
 * @param tags - Cache tags to revalidate
 * @param paths - URL paths to revalidate
 */
export type RevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export type NextEnlaceOptions = EnlaceOptions & {
  /**
   * Auto-generate cache tags from URL path for GET requests.
   * e.g., `/posts/1` generates tags `['posts', 'posts/1']`
   * @default true
   * */
  autoGenerateTags?: boolean;

  /**
   * Auto-revalidate generated tags after successful mutations (POST/PUT/PATCH/DELETE).
   * @default true
   * */
  autoRevalidateTags?: boolean;

  /**
   * Handler called after successful mutations to trigger server-side revalidation.
   * Receives auto-generated or manually specified tags and paths.
   * Usage:
   * ```ts
   * export const api = createEnlace("http://localhost:3000/api/", {
   *  revalidator: (tags, paths) => {
   *    revalidateServerAction(tags, paths); // Next.js server action to revalidate tags
   *  },
   * });
   * ```
   * */
  revalidator?: RevalidateHandler;
};

/** Per-request options for Next.js fetch */
export type NextRequestOptionsBase = {
  /** 
   * Cache tags for caching (GET requests only)  
   * This will auto generate tags from the URL path if not provided and autoGenerateTags is enabled.
   * But can be manually specified to override auto-generation.
   * */
  tags?: string[];

  /** Time in seconds to revalidate, or false to disable */
  revalidate?: number | false;

  /**
   * Cache tags to revalidate after mutation *overrides auto-generated tags*
   * This doesn't do anything on the client by itself - it's passed to the revalidator handler.
   * You must implement the revalidation logic in the revalidator.
   * */
  revalidateTags?: string[];

  /**
   * URL paths to revalidate after mutation
   * This doesn't do anything on the client by itself - it's passed to the revalidator handler.
   * You must implement the revalidation logic in the revalidator.
   * */
  revalidatePaths?: string[];

  /**
   * Skip server-side revalidation for this request.
   * Useful when autoRevalidateTags is enabled but you want to opt-out for specific mutations.
   * You can still pass empty [] to revalidateTags to skip triggering revalidation.
   * But this flag can be used if you want to revalidate client-side and skip server-side entirely.
   * Eg. you don't fetch any data on server component and you might want to skip the overhead of revalidation.
   * */
  skipRevalidator?: boolean;
};
