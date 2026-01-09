export type ServerRevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export interface NextjsPluginConfig {
  serverRevalidator?: ServerRevalidateHandler;
  skipServerRevalidation?: boolean;
}

export type NextjsReadOptions = object;

export interface NextjsWriteOptions {
  revalidatePaths?: string[];
  serverRevalidate?: boolean;
}

export type NextjsInfiniteReadOptions = object;

export type NextjsReadResult = object;

export type NextjsWriteResult = object;
