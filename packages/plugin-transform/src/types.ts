import type { ResolverContext } from "@spoosh/core";

export type MaybePromise<T> = T | Promise<T>;

/**
 * Transform response data after request. Returns transformedData (can be any type).
 */
export type ResponseTransformer<TIn = unknown, TOut = unknown> = (
  response: TIn
) => MaybePromise<TOut>;

/**
 * Plugin-level config. All transforms are per-request only for type inference.
 */
export type TransformPluginConfig = object;

export interface TransformReadOptions {
  /** Per-request transform function for response data. */
  transform?: ResponseTransformer<unknown, unknown>;
}

export interface TransformWriteOptions {
  /** Per-request transform function for response data. */
  transform?: ResponseTransformer<unknown, unknown>;
}

export type TransformPagesOptions = object;

export interface TransformQueueOptions {
  /** Per-request transform function for response data. */
  transform?: ResponseTransformer<unknown, unknown>;
}

export type TransformReadResult = object;

export type TransformWriteResult = {
  transformedData?: unknown;
};

export type TransformQueueResult = {
  transformedData?: unknown;
};

export type TransformOptions = TransformReadOptions | TransformWriteOptions;

/**
 * Extracts the return type of a response transformer from hook options.
 * Returns `never` if no response transformer is provided.
 */
export type InferTransformedData<TOptions> = TOptions extends {
  transform: (data: never) => MaybePromise<infer R>;
}
  ? R
  : never;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext extends ResolverContext> {
    transform: ResponseTransformer<TContext["data"], unknown> | undefined;
  }

  interface PluginResultResolvers<TOptions> {
    transformedData: TOptions extends {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform?: (data: any) => MaybePromise<infer R>;
    }
      ? Awaited<R> | undefined
      : never;
  }
}
