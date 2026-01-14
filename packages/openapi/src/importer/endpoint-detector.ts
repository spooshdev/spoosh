import type { OpenAPIOperation, JSONSchema } from "../types.js";
import type { EndpointTypeInfo, ConversionContext } from "./types.js";
import { schemaToTypeScript, sanitizePropertyName } from "./schema-to-type.js";

/**
 * Detect endpoint type and extract type information from OpenAPI operation
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @returns Endpoint type information
 */
export function detectEndpointType(
  operation: OpenAPIOperation,
  ctx: ConversionContext
): EndpointTypeInfo {
  const hasQuery = operation.parameters?.some((p) => p.in === "query");
  const hasRequestBody = !!operation.requestBody;
  const contentTypes = operation.requestBody?.content
    ? Object.keys(operation.requestBody.content)
    : [];
  const contentType = contentTypes[0];

  const dataType = extractResponseType(operation, ctx);
  const errorType = extractErrorType(operation, ctx);
  const description = operation.summary || operation.description;

  const info: EndpointTypeInfo = {
    dataType,
    errorType,
    description,
    isVoid: dataType === "void",
  };

  if (hasQuery) {
    info.queryType = extractQueryType(operation, ctx);
  }

  if (contentType === "multipart/form-data") {
    info.formDataType = extractFormDataType(operation, ctx);
  } else if (hasRequestBody && contentType === "application/json") {
    info.bodyType = extractBodyType(operation, ctx, "application/json");
  } else if (
    hasRequestBody &&
    contentType === "application/x-www-form-urlencoded"
  ) {
    info.urlEncodedType = extractBodyType(
      operation,
      ctx,
      "application/x-www-form-urlencoded"
    );
  }

  return info;
}

/**
 * Extract response data type from operation
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @returns TypeScript type string
 */
function extractResponseType(
  operation: OpenAPIOperation,
  ctx: ConversionContext
): string {
  const successResponses = ["200", "201", "204"];

  for (const code of successResponses) {
    const response = operation.responses[code];
    if (!response) continue;

    if (code === "204" || !response.content) {
      return "void";
    }

    const jsonContent = response.content?.["application/json"];
    if (jsonContent?.schema) {
      return schemaToTypeScript(jsonContent.schema, ctx);
    }
  }

  return "unknown";
}

/**
 * Extract error type from 4xx/5xx responses
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @returns TypeScript error type string or undefined
 */
function extractErrorType(
  operation: OpenAPIOperation,
  ctx: ConversionContext
): string | undefined {
  const errorSchemas: JSONSchema[] = [];

  for (const [code, response] of Object.entries(operation.responses)) {
    const statusCode = parseInt(code, 10);
    if (statusCode >= 400 && statusCode < 600) {
      const jsonContent = response.content?.["application/json"];
      if (jsonContent?.schema) {
        errorSchemas.push(jsonContent.schema);
      }
    }
  }

  if (errorSchemas.length === 0) {
    return undefined;
  }

  if (errorSchemas.length === 1) {
    return schemaToTypeScript(errorSchemas[0], ctx);
  }

  const errorTypes = errorSchemas.map((schema) =>
    schemaToTypeScript(schema, ctx)
  );
  return errorTypes.join(" | ");
}

/**
 * Extract query parameter type from operation
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @returns TypeScript query type string
 */
function extractQueryType(
  operation: OpenAPIOperation,
  ctx: ConversionContext
): string {
  const queryParams =
    operation.parameters?.filter((p) => p.in === "query") || [];

  if (queryParams.length === 0) {
    return "Record<string, never>";
  }

  const props = queryParams.map((param) => {
    const sanitizedName = sanitizePropertyName(param.name);
    const optional = !param.required ? "?" : "";
    const paramType = schemaToTypeScript(param.schema, ctx);
    return `${sanitizedName}${optional}: ${paramType}`;
  });

  return `{ ${props.join("; ")} }`;
}

type SupportedContentType =
  | "application/json"
  | "application/x-www-form-urlencoded";

/**
 * Extract request body type from operation
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @param contentType Content type to extract from
 * @returns TypeScript body type string
 */
function extractBodyType(
  operation: OpenAPIOperation,
  ctx: ConversionContext,
  contentType: SupportedContentType = "application/json"
): string {
  const content = operation.requestBody?.content?.[contentType];

  if (!content?.schema) {
    return "never";
  }

  return schemaToTypeScript(content.schema, ctx);
}

/**
 * Extract form data type from operation
 * @param operation OpenAPI operation
 * @param ctx Conversion context
 * @returns TypeScript form data type string
 */
function extractFormDataType(
  operation: OpenAPIOperation,
  ctx: ConversionContext
): string {
  const formContent = operation.requestBody?.content?.["multipart/form-data"];

  if (!formContent?.schema) {
    return "FormData";
  }

  return schemaToTypeScript(formContent.schema, ctx);
}
