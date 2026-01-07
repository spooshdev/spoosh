export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SchemaMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

export type MethodDefinition = {
  data: unknown;
  error: unknown;
  body?: unknown;
};
