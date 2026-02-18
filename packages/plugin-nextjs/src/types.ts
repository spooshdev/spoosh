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

export type NextjsWriteOptions = object;

export interface NextjsWriteTriggerOptions {
  /** Additional paths to revalidate after mutation */
  revalidatePaths?: string[];

  /** Whether to trigger server revalidation. Overrides plugin default. */
  serverRevalidate?: boolean;
}

export type NextjsPagesOptions = object;

export interface NextjsQueueTriggerOptions {
  /** Additional paths to revalidate after queue item completes */
  revalidatePaths?: string[];

  /** Whether to trigger server revalidation. Overrides plugin default. */
  serverRevalidate?: boolean;
}

export type NextjsReadResult = object;

export type NextjsWriteResult = object;

export type NextjsQueueResult = object;
