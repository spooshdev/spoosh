import type { JSONSchema } from "../types.js";
import type { ConversionContext } from "./types.js";

const TS_KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
]);

/**
 * Map of sanitized names to original OpenAPI names
 * Used to preserve original names with dots for round-trip conversion
 */
export const ORIGINAL_NAMES = new Map<string, string>();

/**
 * Sanitize type name to avoid TypeScript keyword conflicts
 * @param name Type name
 * @returns Sanitized name
 */
export function sanitizeTypeName(name: string): string {
  if (TS_KEYWORDS.has(name)) {
    const sanitized = `${name}Type`;
    ORIGINAL_NAMES.set(sanitized, name);
    return sanitized;
  }

  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");

  // Store original name if it was changed
  if (sanitized !== name) {
    ORIGINAL_NAMES.set(sanitized, name);
  }

  return sanitized;
}

/**
 * Check if a property name needs to be quoted
 * @param name Property name
 * @returns Quoted property name if needed, otherwise the original name
 */
export function sanitizePropertyName(name: string): string {
  // Valid JavaScript identifier pattern
  const isValidIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

  if (!isValidIdentifier || TS_KEYWORDS.has(name)) {
    return `"${name}"`;
  }

  return name;
}

/**
 * Extract type name from $ref
 * @param ref Reference string (e.g., "#/components/schemas/Post")
 * @returns Type name
 */
export function extractTypeNameFromRef(ref: string): string {
  const parts = ref.split("/");
  const name = parts[parts.length - 1];
  return sanitizeTypeName(name || "Unknown");
}

/**
 * Deduplicate types in a union string
 * @param unionStr Union type string (e.g., "string | null | null")
 * @returns Deduplicated union string (e.g., "string | null")
 */
function deduplicateUnion(unionStr: string): string {
  const types = unionStr.split(" | ").map((t) => t.trim());
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const t of types) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }

  return unique.join(" | ");
}

/**
 * Convert JSON Schema to TypeScript type string
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth (for recursion limit)
 * @returns TypeScript type string
 */
export function schemaToTypeScript(
  schema: JSONSchema | undefined,
  ctx: ConversionContext,
  depth = 0
): string {
  if (!schema || depth > 50) {
    return "unknown";
  }

  if (schema.$ref) {
    const typeName = extractTypeNameFromRef(schema.$ref);
    ctx.refs.add(schema.$ref);
    return schema.nullable ? `${typeName} | null` : typeName;
  }

  // Handle schema with ONLY nullable (no type specified) - OpenAPI 3.0
  // Note: unknown already includes null semantically, so we use just unknown
  // to avoid TypeScript normalizing "unknown | null" back to "unknown"
  if (
    schema.nullable &&
    !schema.type &&
    !schema.enum &&
    !schema.oneOf &&
    !schema.allOf &&
    !schema.anyOf &&
    !schema.properties &&
    !schema.items
  ) {
    return "unknown";
  }

  let baseType = generateBaseType(schema, ctx, depth);

  if (schema.nullable && !baseType.includes(" | null")) {
    baseType = `${baseType} | null`;
  }

  return deduplicateUnion(baseType);
}

/**
 * Generate base TypeScript type from JSON Schema
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth
 * @returns TypeScript type string
 */
function generateBaseType(
  schema: JSONSchema,
  ctx: ConversionContext,
  depth: number
): string {
  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  if (schema.enum && !Array.isArray(schema.type)) {
    const sortedEnum = [...schema.enum].sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    });
    return sortedEnum.map((v) => JSON.stringify(v)).join(" | ");
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const types = schema.oneOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .sort();
    return types.join(" | ");
  }

  if (schema.allOf && schema.allOf.length > 0) {
    const types = schema.allOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .sort();
    return types.join(" & ");
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const types = schema.anyOf
      .map((s) => schemaToTypeScript(s, ctx, depth + 1))
      .sort();
    return types.join(" | ");
  }

  // OpenAPI 3.1: Handle type arrays (e.g., ["string", "null"])
  if (Array.isArray(schema.type)) {
    const hasNull = schema.type.includes("null");
    const nonNullTypes = schema.type.filter((t) => t !== "null");

    if (schema.enum && Array.isArray(schema.enum) && nonNullTypes.length > 0) {
      const sortedEnum = [...schema.enum].sort((a, b) => {
        const aStr = JSON.stringify(a);
        const bStr = JSON.stringify(b);
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      });
      const enumType = sortedEnum
        .map((v: unknown) => JSON.stringify(v))
        .join(" | ");
      return hasNull ? `${enumType} | null` : enumType;
    }

    const types = nonNullTypes
      .map((t) => {
        const singleTypeSchema = { ...schema, type: t };
        delete singleTypeSchema.enum;
        return generateBaseType(singleTypeSchema, ctx, depth);
      })
      .filter(Boolean);

    const baseType = types.join(" | ") || "unknown";
    return hasNull ? `${baseType} | null` : baseType;
  }

  switch (schema.type) {
    case "string":
      if (schema.format === "binary") {
        return "File";
      }
      return "string";

    case "number":
    case "integer":
      return "number";

    case "boolean":
      return "boolean";

    case "null":
      return "null";

    case "array":
      if (schema.items) {
        const itemType = schemaToTypeScript(schema.items, ctx, depth + 1);
        return `${itemType}[]`;
      }
      return "unknown[]";

    case "object":
      return generateObjectType(schema, ctx, depth);

    default:
      return "unknown";
  }
}

/**
 * Generate TypeScript object type from JSON Schema
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @param depth Current depth
 * @returns TypeScript object type string
 */
function generateObjectType(
  schema: JSONSchema,
  ctx: ConversionContext,
  depth: number
): string {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);

  if (Object.keys(properties).length === 0) {
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      const valueType = schemaToTypeScript(
        schema.additionalProperties,
        ctx,
        depth + 1
      );
      return `Record<string, ${valueType}>`;
    }
    return "Record<string, unknown>";
  }

  const hasJsDoc =
    ctx.options.jsdoc && Object.values(properties).some((p) => p.description);

  if (hasJsDoc) {
    const lines: string[] = [];
    for (const [key, propSchema] of Object.entries(properties)) {
      const sanitizedKey = sanitizePropertyName(key);
      const optional = !required.has(key) ? "?" : "";
      const propType = schemaToTypeScript(propSchema, ctx, depth + 1);

      if (propSchema.description) {
        lines.push(`  /** ${propSchema.description} */`);
      }

      lines.push(`  ${sanitizedKey}${optional}: ${propType};`);
    }
    return `{\n${lines.join("\n")}\n}`;
  }

  const props: string[] = [];
  for (const [key, propSchema] of Object.entries(properties)) {
    const sanitizedKey = sanitizePropertyName(key);
    const optional = !required.has(key) ? "?" : "";
    const propType = schemaToTypeScript(propSchema, ctx, depth + 1);
    props.push(`${sanitizedKey}${optional}: ${propType}`);
  }

  return `{ ${props.join("; ")} }`;
}

/**
 * Generate named type definition from JSON Schema
 * @param name Type name
 * @param schema JSON Schema
 * @param ctx Conversion context
 * @returns TypeScript type definition string
 */
export function generateNamedType(
  name: string,
  schema: JSONSchema,
  ctx: ConversionContext
): string {
  const sanitizedName = sanitizeTypeName(name);
  const typeString = schemaToTypeScript(schema, ctx, 0);
  const lines: string[] = [];

  // Always add @openapiName if the name was sanitized
  const originalName = ORIGINAL_NAMES.get(sanitizedName);
  if (originalName) {
    if (ctx.options.jsdoc && schema.description) {
      lines.push(`/**`);
      lines.push(` * ${schema.description}`);
      lines.push(` * @openapiName ${originalName}`);
      lines.push(` */`);
    } else {
      lines.push(`/** @openapiName ${originalName} */`);
    }
  } else if (ctx.options.jsdoc && schema.description) {
    lines.push(`/** ${schema.description} */`);
  }

  lines.push(`type ${sanitizedName} = ${typeString};`);

  return lines.join("\n");
}
