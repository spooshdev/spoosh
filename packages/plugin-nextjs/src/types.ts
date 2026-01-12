export type ServerRevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export interface NextjsPluginConfig {
  /** Server action to revalidate tags and paths */
  serverRevalidator?: ServerRevalidateHandler;

  /** Skip server revalidation by default. Default: false */
  skipServerRevalidation?: boolean;
}

export type NextjsReadOptions = object;

export interface NextjsWriteOptions {
  /** Additional paths to revalidate after mutation */
  revalidatePaths?: string[];

  /** Whether to trigger server revalidation. Overrides plugin default. */
  serverRevalidate?: boolean;
}

export type NextjsInfiniteReadOptions = object;

export type NextjsReadResult = object;

export type NextjsWriteResult = object;
