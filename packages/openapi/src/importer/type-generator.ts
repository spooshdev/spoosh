import type { OpenAPISpec } from "../types.js";
import type {
  ConversionContext,
  ImportOptions,
  NestedEndpointStructure,
  EndpointTypeInfo,
} from "./types.js";
import { convertPathsToSpooshStructure } from "./path-converter.js";
import { detectEndpointType } from "./endpoint-detector.js";
import {
  generateNamedType,
  sanitizeTypeName,
  ORIGINAL_NAMES,
} from "./schema-to-type.js";

/**
 * Generate TypeScript Spoosh schema from OpenAPI spec
 * @param spec OpenAPI specification
 * @param options Import options
 * @returns Generated TypeScript code
 */
export function generateSpooshSchema(
  spec: OpenAPISpec,
  options: ImportOptions = {}
): string {
  // Clear the original names map at the start of each import
  ORIGINAL_NAMES.clear();

  const ctx: ConversionContext = {
    namedTypes: new Map(),
    refs: new Set(),
    options: {
      typeName: "ApiSchema",
      includeImports: false,
      jsdoc: false,
      ...options,
    },
    spec,
  };

  const endpointInfoMap = new Map<string, EndpointTypeInfo>();

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const methods = ["get", "post", "put", "patch", "delete"] as const;

    for (const method of methods) {
      const operation = pathItem[method];
      if (operation) {
        const key = `${path}:${method}`;
        const endpointInfo = detectEndpointType(operation, ctx);
        endpointInfoMap.set(key, endpointInfo);
      }
    }
  }

  const structure = convertPathsToSpooshStructure(spec, endpointInfoMap);

  const sections: string[] = [];

  if (ctx.options.includeImports) {
    sections.push(generateImports(endpointInfoMap));
  }

  if (spec.components?.schemas) {
    sections.push(generateComponentTypes(spec, ctx));
  }

  sections.push(generateSchemaType(structure, ctx));

  return sections.filter((s) => s.length > 0).join("\n\n");
}

/**
 * Generate import statements
 * @param endpointInfoMap Map of endpoint info
 * @returns Import statement string
 */
function generateImports(
  endpointInfoMap: Map<string, EndpointTypeInfo>
): string {
  const imports = new Set<string>();

  for (const info of endpointInfoMap.values()) {
    if (info.type === "Endpoint") {
      imports.add("Endpoint");
    } else if (info.type === "EndpointWithQuery") {
      imports.add("EndpointWithQuery");
    } else if (info.type === "EndpointWithFormData") {
      imports.add("EndpointWithFormData");
    }
  }

  if (imports.size === 0) {
    return "";
  }

  const importList = Array.from(imports).sort().join(", ");
  return `import type { ${importList} } from "@spoosh/core";`;
}

/**
 * Generate component type definitions
 * @param spec OpenAPI spec
 * @param ctx Conversion context
 * @returns Type definitions string
 */
function generateComponentTypes(
  spec: OpenAPISpec,
  ctx: ConversionContext
): string {
  const types: string[] = [];

  if (!spec.components?.schemas) {
    return "";
  }

  const sortedSchemas = Object.entries(spec.components.schemas).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [name, schema] of sortedSchemas) {
    const typeDefinition = generateNamedType(name, schema, ctx);
    types.push(typeDefinition);
  }

  return types.join("\n\n");
}

/**
 * Generate main schema type
 * @param structure Nested structure
 * @param ctx Conversion context
 * @returns Schema type definition
 */
function generateSchemaType(
  structure: NestedEndpointStructure,
  ctx: ConversionContext
): string {
  const typeName = sanitizeTypeName(ctx.options.typeName || "ApiSchema");
  const schemaBody = generateStructureBody(structure, ctx, 1);

  return `export type ${typeName} = ${schemaBody};`;
}

/**
 * Generate structure body recursively
 * @param structure Nested structure
 * @param ctx Conversion context
 * @param indent Indentation level
 * @returns TypeScript object literal string
 */
function generateStructureBody(
  structure: NestedEndpointStructure,
  ctx: ConversionContext,
  indent: number
): string {
  const entries: string[] = [];
  const indentStr = "  ".repeat(indent);

  for (const [key, value] of Object.entries(structure)) {
    const quotedKey = quoteKeyIfNeeded(key);

    if (isEndpointTypeInfo(value)) {
      const endpointStr = generateEndpointType(value);

      if (ctx.options.jsdoc && value.description) {
        entries.push(`${indentStr}/** ${value.description} */`);
      }

      entries.push(`${indentStr}${quotedKey}: ${endpointStr};`);
    } else {
      entries.push(
        `${indentStr}${quotedKey}: ${generateStructureBody(value, ctx, indent + 1)};`
      );
    }
  }

  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries.join("\n")}\n${"  ".repeat(indent - 1)}}`;
}

/**
 * Generate endpoint type expression
 * @param info Endpoint type info
 * @returns TypeScript type expression
 */
function generateEndpointType(info: EndpointTypeInfo): string {
  if (info.type === "void") {
    return "void";
  }

  if (info.type === "simple") {
    return info.dataType;
  }

  if (info.type === "Endpoint") {
    if (info.errorType) {
      return `Endpoint<${info.dataType}, ${info.bodyType || "never"}, ${info.errorType}>`;
    }
    return `Endpoint<${info.dataType}, ${info.bodyType || "never"}>`;
  }

  if (info.type === "EndpointWithQuery") {
    if (info.errorType) {
      return `EndpointWithQuery<${info.dataType}, ${info.queryType || "never"}, ${info.errorType}>`;
    }
    return `EndpointWithQuery<${info.dataType}, ${info.queryType || "never"}>`;
  }

  if (info.type === "EndpointWithFormData") {
    if (info.errorType) {
      return `EndpointWithFormData<${info.dataType}, ${info.formDataType || "FormData"}, ${info.errorType}>`;
    }
    return `EndpointWithFormData<${info.dataType}, ${info.formDataType || "FormData"}>`;
  }

  return info.dataType;
}

/**
 * Type guard to check if value is EndpointTypeInfo
 * @param value Value to check
 * @returns True if value is EndpointTypeInfo
 */
function isEndpointTypeInfo(
  value: NestedEndpointStructure | EndpointTypeInfo
): value is EndpointTypeInfo {
  return "type" in value && "dataType" in value;
}

/**
 * Quote property name if needed
 * @param key Property name
 * @returns Quoted or unquoted key
 */
function quoteKeyIfNeeded(key: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return key;
  }

  return JSON.stringify(key);
}
