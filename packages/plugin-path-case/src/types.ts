export type BuiltInCase = "camel" | "kebab" | "snake" | "pascal";

export type CaseConverter = (segment: string) => string;

export type PathCaseTarget = BuiltInCase | CaseConverter;

export type PathCasePluginConfig = {
  /** Target case for HTTP request URLs - built-in case name or custom function */
  targetCase: PathCaseTarget;

  /** Segments to skip transformation (e.g., 'v1', 'api') */
  exclude?: string[];
};

export type PathCaseRequestOptions = {
  /** Override target case for this request */
  targetCase?: PathCaseTarget;

  /** Override exclude list for this request */
  exclude?: string[];
};

export type PathCaseHookOptions = {
  pathCase?: PathCaseRequestOptions;
};

type KebabToCamel<S extends string> = S extends `-${infer U}`
  ? `-${KebabToCamel<U>}`
  : S extends `${infer T}-${infer U}`
    ? U extends ""
      ? S
      : `${T}${Capitalize<KebabToCamel<U>>}`
    : S;

type SnakeToCamel<S extends string> = S extends "_"
  ? "_"
  : S extends `_${infer U}`
    ? `_${SnakeToCamel<U>}`
    : S extends `${infer T}_${infer U}`
      ? U extends ""
        ? S
        : `${T}${Capitalize<SnakeToCamel<U>>}`
      : S;

type IsPathKey<K extends string> = K extends `$${string}` | "_" ? false : true;

type TransformKey<K extends string> =
  IsPathKey<K> extends true ? KebabToCamel<SnakeToCamel<K>> : K;

/**
 * Transforms only API path keys in a schema to camelCase.
 * Handles both kebab-case and snake_case conversions.
 *
 * **Only transforms path segment keys** - preserves request body, query, and response types unchanged.
 * Special keys (`$get`, `$post`, `_`, etc.) and their contents are preserved as-is.
 *
 * @example
 * ```ts
 * type Schema = {
 *   "hello-world": {
 *     $get: () => Promise<{ data: string }>;
 *     $post: { body: { user_name: string } };  // body types preserved
 *   }
 * };
 * type CamelSchema = CamelCaseKeys<Schema>;
 * // Result: {
 * //   helloWorld: {
 * //     $get: () => Promise<{ data: string }>;
 * //     $post: { body: { user_name: string } };  // unchanged
 * //   }
 * // }
 * ```
 */
export type CamelCaseKeys<T> = T extends object
  ? T extends (...args: unknown[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : {
          [K in keyof T as K extends string ? TransformKey<K> : K]: K extends
            | `$${string}`
            | "_"
            ? T[K]
            : CamelCaseKeys<T[K]>;
        }
  : T;

type CamelToKebab<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToKebab<U>}`
    : `${Lowercase<T>}-${CamelToKebab<U>}`
  : S;

type TransformToKebab<K extends string> =
  IsPathKey<K> extends true ? CamelToKebab<K> : K;

/**
 * Transforms only API path keys in a schema to kebab-case.
 *
 * **Only transforms path segment keys** - preserves request body, query, and response types unchanged.
 *
 * @example
 * ```ts
 * type Schema = { helloWorld: { $get: () => Promise<{ data: string }> } };
 * type KebabSchema = KebabCaseKeys<Schema>;
 * // Result: { "hello-world": { $get: () => Promise<{ data: string }> } }
 * ```
 */
export type KebabCaseKeys<T> = T extends object
  ? T extends (...args: unknown[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : {
          [K in keyof T as K extends string
            ? TransformToKebab<K>
            : K]: K extends `$${string}` | "_" ? T[K] : KebabCaseKeys<T[K]>;
        }
  : T;

type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToSnake<U>}`
    : `${Lowercase<T>}_${CamelToSnake<U>}`
  : S;

type TransformToSnake<K extends string> =
  IsPathKey<K> extends true ? CamelToSnake<K> : K;

/**
 * Transforms only API path keys in a schema to snake_case.
 *
 * **Only transforms path segment keys** - preserves request body, query, and response types unchanged.
 *
 * @example
 * ```ts
 * type Schema = { helloWorld: { $get: () => Promise<{ data: string }> } };
 * type SnakeSchema = SnakeCaseKeys<Schema>;
 * // Result: { hello_world: { $get: () => Promise<{ data: string }> } }
 * ```
 */
export type SnakeCaseKeys<T> = T extends object
  ? T extends (...args: unknown[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : {
          [K in keyof T as K extends string
            ? TransformToSnake<K>
            : K]: K extends `$${string}` | "_" ? T[K] : SnakeCaseKeys<T[K]>;
        }
  : T;

type CamelToPascal<S extends string> = S extends `${infer T}${infer U}`
  ? `${Uppercase<T>}${U}`
  : S;

type TransformToPascal<K extends string> =
  IsPathKey<K> extends true ? CamelToPascal<K> : K;

/**
 * Transforms only API path keys in a schema to PascalCase.
 *
 * **Only transforms path segment keys** - preserves request body, query, and response types unchanged.
 *
 * @example
 * ```ts
 * type Schema = { helloWorld: { $get: () => Promise<{ data: string }> } };
 * type PascalSchema = PascalCaseKeys<Schema>;
 * // Result: { HelloWorld: { $get: () => Promise<{ data: string }> } }
 * ```
 */
export type PascalCaseKeys<T> = T extends object
  ? T extends (...args: unknown[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? T
      : {
          [K in keyof T as K extends string
            ? TransformToPascal<K>
            : K]: K extends `$${string}` | "_" ? T[K] : PascalCaseKeys<T[K]>;
        }
  : T;
