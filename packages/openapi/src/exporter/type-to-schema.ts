import ts from "typescript";
import type { JSONSchema } from "../types.js";

const MAX_DEPTH = 50;

function isStandardLibrarySymbol(symbol: ts.Symbol | undefined): boolean {
  if (!symbol) return false;

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return false;

  return declarations.some((decl) => {
    const fileName = decl.getSourceFile().fileName;
    return (
      fileName.includes("/typescript/lib/") ||
      fileName.includes("\\typescript\\lib\\") ||
      /lib\.[^/\\]+\.d\.ts$/.test(fileName)
    );
  });
}

export type SchemaContext = {
  checker: ts.TypeChecker;
  schemas: Map<string, JSONSchema>;
  visitedTypes: Set<string>;
  depth: number;
  openapiVersion: "3.0.0" | "3.1.0";
};

/**
 * Get original OpenAPI name from JSDoc @openapiName tag
 */
function getOriginalNameFromSymbol(symbol: ts.Symbol): string | undefined {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) {
    return undefined;
  }

  for (const decl of declarations) {
    if (ts.isTypeAliasDeclaration(decl)) {
      const jsDocTags = ts.getJSDocTags(decl);
      for (const tag of jsDocTags) {
        if (tag.tagName.text === "openapiName" && tag.comment) {
          return typeof tag.comment === "string"
            ? tag.comment
            : tag.comment.map((c) => c.text).join("");
        }
      }
    }
  }

  return undefined;
}

/**
 * Get original OpenAPI name from type reference node by looking up the declaration
 */
function getOriginalNameFromTypeNode(
  typeNode: ts.TypeReferenceNode,
  checker: ts.TypeChecker
): string | undefined {
  if (!ts.isIdentifier(typeNode.typeName)) {
    return undefined;
  }

  const symbol = checker.getSymbolAtLocation(typeNode.typeName);
  if (!symbol) {
    return undefined;
  }

  return getOriginalNameFromSymbol(symbol);
}

export function createSchemaContext(
  checker: ts.TypeChecker,
  openapiVersion: "3.0.0" | "3.1.0" = "3.1.0"
): SchemaContext {
  return {
    checker,
    schemas: new Map(),
    visitedTypes: new Set(),
    depth: 0,
    openapiVersion,
  };
}

export function typeToSchema(type: ts.Type, ctx: SchemaContext): JSONSchema {
  if (ctx.depth > MAX_DEPTH) {
    return {};
  }

  const { checker } = ctx;

  // Check union types BEFORE checking primitive types
  // This ensures `unknown | null` is handled by union logic
  if (type.isUnion()) {
    const symbol = type.aliasSymbol;
    const typeName = symbol?.getName();

    const builtInTypes = new Set([
      "Date",
      "Record",
      "Partial",
      "Required",
      "Pick",
      "Omit",
      "Readonly",
      "Array",
      "Map",
      "Set",
      "Promise",
    ]);

    if (
      typeName &&
      typeName !== "__type" &&
      !typeName.startsWith("__") &&
      !builtInTypes.has(typeName) &&
      !ctx.visitedTypes.has(typeName) &&
      !isStandardLibrarySymbol(type.aliasSymbol)
    ) {
      ctx.visitedTypes.add(typeName);

      const hasNull = type.types.some((t) => t.flags & ts.TypeFlags.Null);
      const nonNullTypes = type.types.filter(
        (t) =>
          !(t.flags & ts.TypeFlags.Null) && !(t.flags & ts.TypeFlags.Undefined)
      );

      let enumSchema: JSONSchema;
      if (nonNullTypes.every((t) => t.isStringLiteral())) {
        const enumValues = nonNullTypes
          .map((t) => (t as ts.StringLiteralType).value)
          .sort((a, b) => {
            const aStr = JSON.stringify(a);
            const bStr = JSON.stringify(b);
            return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
          });
        enumSchema = { type: "string", enum: enumValues };
      } else if (nonNullTypes.every((t) => t.isNumberLiteral())) {
        const enumValues = nonNullTypes
          .map((t) => (t as ts.NumberLiteralType).value)
          .sort((a, b) => a - b);
        enumSchema = { type: "number", enum: enumValues };
      } else {
        enumSchema = {
          oneOf: nonNullTypes.map((t) =>
            typeToSchema(t, { ...ctx, depth: ctx.depth + 1 })
          ),
        };
      }

      if (hasNull) {
        if (ctx.openapiVersion === "3.1.0") {
          if (enumSchema.type && typeof enumSchema.type === "string") {
            enumSchema = { ...enumSchema, type: [enumSchema.type, "null"] };
          } else if (enumSchema.oneOf) {
            enumSchema = { oneOf: [...enumSchema.oneOf, { type: "null" }] };
          }
        } else {
          enumSchema = { ...enumSchema, nullable: true };
        }
      }

      const originalName = symbol
        ? getOriginalNameFromSymbol(symbol)
        : undefined;
      const schemaName = originalName || typeName;

      ctx.schemas.set(schemaName, enumSchema);
      ctx.visitedTypes.delete(typeName);
      return { $ref: `#/components/schemas/${schemaName}` };
    }

    const nonNullTypes = type.types.filter(
      (t) =>
        !(t.flags & ts.TypeFlags.Null) && !(t.flags & ts.TypeFlags.Undefined)
    );
    const hasNull = type.types.some((t) => t.flags & ts.TypeFlags.Null);

    if (
      nonNullTypes.length === 1 &&
      (nonNullTypes[0]!.flags & ts.TypeFlags.Any ||
        nonNullTypes[0]!.flags & ts.TypeFlags.Unknown) &&
      hasNull
    ) {
      if (ctx.openapiVersion === "3.1.0") {
        return {};
      }

      return { nullable: true };
    }

    if (
      nonNullTypes.length === 2 &&
      nonNullTypes.every((t) => t.flags & ts.TypeFlags.BooleanLiteral) &&
      hasNull
    ) {
      const schema = { type: "boolean" as const };

      if (ctx.openapiVersion === "3.1.0") {
        return { ...schema, type: ["boolean", "null"] };
      }

      return { ...schema, nullable: true };
    }

    if (nonNullTypes.every((t) => t.isStringLiteral()) && hasNull) {
      const enumValues = nonNullTypes
        .map((t) => (t as ts.StringLiteralType).value)
        .sort((a, b) => {
          const aStr = JSON.stringify(a);
          const bStr = JSON.stringify(b);
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        });
      const schema = { type: "string" as const, enum: enumValues };

      if (ctx.openapiVersion === "3.1.0") {
        return { ...schema, type: ["string", "null"] };
      }

      return { ...schema, nullable: true };
    }

    if (nonNullTypes.every((t) => t.isNumberLiteral()) && hasNull) {
      const enumValues = nonNullTypes
        .map((t) => (t as ts.NumberLiteralType).value)
        .sort((a, b) => a - b);
      const schema = { type: "number" as const, enum: enumValues };

      if (ctx.openapiVersion === "3.1.0") {
        return { ...schema, type: ["number", "null"] };
      }

      return { ...schema, nullable: true };
    }

    if (nonNullTypes.length === 1 && hasNull) {
      const schema = typeToSchema(nonNullTypes[0]!, {
        ...ctx,
        depth: ctx.depth + 1,
      });

      if (ctx.openapiVersion === "3.1.0") {
        if (schema.type && typeof schema.type === "string") {
          return { ...schema, type: [schema.type, "null"] };
        }
        return { oneOf: [schema, { type: "null" }] };
      }

      return { ...schema, nullable: true };
    }

    if (nonNullTypes.every((t) => t.isStringLiteral())) {
      const enumValues = nonNullTypes
        .map((t) => (t as ts.StringLiteralType).value)
        .sort((a, b) => {
          const aStr = JSON.stringify(a);
          const bStr = JSON.stringify(b);
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
        });
      return {
        type: "string",
        enum: enumValues,
      };
    }

    if (nonNullTypes.every((t) => t.isNumberLiteral())) {
      const enumValues = nonNullTypes
        .map((t) => (t as ts.NumberLiteralType).value)
        .sort((a, b) => a - b);
      return {
        type: "number",
        enum: enumValues,
      };
    }

    if (
      nonNullTypes.length === 2 &&
      nonNullTypes.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)
    ) {
      return { type: "boolean" };
    }

    const nextCtx = { ...ctx, depth: ctx.depth + 1 };
    const oneOfSchemas = nonNullTypes.map((t) => typeToSchema(t, nextCtx));

    // Sort oneOf schemas for consistent ordering
    const sortedOneOf = oneOfSchemas.sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    });

    const schema = {
      oneOf: sortedOneOf,
    };

    // For OpenAPI 3.0, add nullable if the union includes null
    if (ctx.openapiVersion === "3.0.0" && hasNull) {
      return { ...schema, nullable: true };
    }

    // For OpenAPI 3.1, add null to oneOf
    if (ctx.openapiVersion === "3.1.0" && hasNull) {
      return {
        oneOf: [...schema.oneOf, { type: "null" }],
      };
    }

    return schema;
  }

  if (type.isIntersection()) {
    return intersectionTypeToSchema(type, { ...ctx, depth: ctx.depth + 1 });
  }

  if (checker.isArrayType(type)) {
    const typeArgs = (type as ts.TypeReference).typeArguments;
    if (typeArgs?.[0]) {
      return {
        type: "array",
        items: typeToSchema(typeArgs[0], { ...ctx, depth: ctx.depth + 1 }),
      };
    }
    return { type: "array" };
  }

  if (type.flags & ts.TypeFlags.Object) {
    const symbol = type.aliasSymbol ?? type.getSymbol();
    const typeName = symbol?.getName();

    const builtInTypes = new Set([
      "Date",
      "Record",
      "Partial",
      "Required",
      "Pick",
      "Omit",
      "Readonly",
      "Array",
      "Map",
      "Set",
      "Promise",
    ]);

    if (typeName === "Date") {
      return { type: "string", format: "date-time" };
    }

    if (type.aliasSymbol?.getName() === "Record") {
      const typeArgs =
        (type as ts.TypeReference & { aliasTypeArguments?: readonly ts.Type[] })
          .aliasTypeArguments || (type as ts.TypeReference).typeArguments;
      if (typeArgs?.[1]) {
        const valueSchema = typeToSchema(typeArgs[1], {
          ...ctx,
          depth: ctx.depth + 1,
        });
        return {
          type: "object",
          additionalProperties: valueSchema,
        };
      }
      return { type: "object" };
    }

    if (
      typeName &&
      typeName !== "__type" &&
      !typeName.startsWith("__") &&
      !builtInTypes.has(typeName) &&
      !isStandardLibrarySymbol(symbol)
    ) {
      const originalName =
        symbol && type.aliasSymbol
          ? getOriginalNameFromSymbol(type.aliasSymbol)
          : undefined;
      const schemaName = originalName || typeName;

      if (ctx.visitedTypes.has(typeName)) {
        return { $ref: `#/components/schemas/${schemaName}` };
      }

      if (!ctx.schemas.has(schemaName)) {
        ctx.visitedTypes.add(typeName);
        const schema = objectTypeToSchema(type, {
          ...ctx,
          depth: 0,
        });
        ctx.schemas.set(schemaName, schema);
        ctx.visitedTypes.delete(typeName);
      }

      return { $ref: `#/components/schemas/${schemaName}` };
    }

    return objectTypeToSchema(type, { ...ctx, depth: ctx.depth + 1 });
  }

  // Primitive type checks (after union/intersection to avoid early returns)
  if (type.flags & ts.TypeFlags.String) {
    return { type: "string" };
  }

  if (type.flags & ts.TypeFlags.Number) {
    return { type: "number" };
  }

  if (type.flags & ts.TypeFlags.Boolean) {
    return { type: "boolean" };
  }

  if (type.flags & ts.TypeFlags.Null) {
    return { type: "null" };
  }

  if (type.flags & ts.TypeFlags.Undefined || type.flags & ts.TypeFlags.Void) {
    return {};
  }

  if (type.flags & ts.TypeFlags.Any || type.flags & ts.TypeFlags.Unknown) {
    return {};
  }

  if (type.flags & ts.TypeFlags.Never) {
    return {};
  }

  if (type.isStringLiteral()) {
    return { type: "string", const: type.value };
  }

  if (type.isNumberLiteral()) {
    return { type: "number", const: type.value };
  }

  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    const intrinsicName = (type as unknown as { intrinsicName: string })
      .intrinsicName;
    return { type: "boolean", const: intrinsicName === "true" };
  }

  return {};
}

function objectTypeToSchema(type: ts.Type, ctx: SchemaContext): JSONSchema {
  const { checker } = ctx;
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  const props = type.getProperties();

  // Check for index signatures (e.g., Record<string, T> or { [key: string]: T })
  const stringIndexInfo = checker.getIndexInfoOfType(type, ts.IndexKind.String);
  if (stringIndexInfo && props.length === 0) {
    const valueSchema = typeToSchema(stringIndexInfo.type, {
      ...ctx,
      depth: ctx.depth + 1,
    });

    return {
      type: "object",
      additionalProperties: valueSchema,
    };
  }

  for (const prop of props) {
    const propName = prop.getName();

    // Skip standard library methods (from Array, Object prototypes)
    // Only check symbol origin, not name - names like "push", "length" could be legitimate properties
    if (isStandardLibrarySymbol(prop)) {
      continue;
    }

    const isOptional = prop.flags & ts.SymbolFlags.Optional;

    let propType: ts.Type;

    const valueDeclaration = prop.valueDeclaration;
    if (
      valueDeclaration &&
      ts.isPropertySignature(valueDeclaration) &&
      valueDeclaration.type
    ) {
      const typeNode = valueDeclaration.type;

      if (ts.isUnionTypeNode(typeNode)) {
        propType = checker.getTypeFromTypeNode(typeNode);
      } else if (ts.isTypeReferenceNode(typeNode)) {
        const referencedType = checker.getTypeAtLocation(typeNode);
        const symbol = referencedType.aliasSymbol ?? referencedType.getSymbol();

        // Get type name from symbol or directly from the TypeReferenceNode
        let typeName = symbol?.getName();
        if (!typeName && ts.isIdentifier(typeNode.typeName)) {
          typeName = typeNode.typeName.text;
        }

        const builtInTypes = new Set([
          "Date",
          "Record",
          "Partial",
          "Required",
          "Pick",
          "Omit",
          "Readonly",
          "Array",
          "Map",
          "Set",
          "Promise",
        ]);

        if (
          typeName &&
          typeName !== "__type" &&
          !typeName.startsWith("__") &&
          !builtInTypes.has(typeName) &&
          !isStandardLibrarySymbol(symbol)
        ) {
          // Get original OpenAPI name from JSDoc if available
          const originalName = getOriginalNameFromTypeNode(typeNode, checker);
          const schemaName = originalName || typeName;

          // Ensure the type alias is registered as a schema
          // Note: typeToSchema handles registration internally, we just trigger it
          if (!ctx.schemas.has(schemaName) && !ctx.visitedTypes.has(typeName)) {
            ctx.visitedTypes.add(typeName);
            typeToSchema(referencedType, { ...ctx, depth: 0 });
            ctx.visitedTypes.delete(typeName);
          }

          properties[propName] = { $ref: `#/components/schemas/${schemaName}` };

          if (!isOptional) {
            required.push(propName);
          }

          continue;
        } else {
          propType = checker.getTypeFromTypeNode(typeNode);
        }
      } else {
        propType = checker.getTypeFromTypeNode(typeNode);
      }
    } else {
      propType = checker.getTypeOfSymbol(prop);
    }

    const propSchema = typeToSchema(propType, {
      ...ctx,
      depth: ctx.depth + 1,
    });

    // For OpenAPI 3.0: optional unknown properties should be { nullable: true }
    // This preserves schemas that were originally { nullable: true } with no type
    if (
      ctx.openapiVersion === "3.0.0" &&
      isOptional &&
      Object.keys(propSchema).length === 0
    ) {
      properties[propName] = { nullable: true };
    } else {
      properties[propName] = propSchema;
    }

    if (!isOptional) {
      required.push(propName);
    }
  }

  const schema: JSONSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

function intersectionTypeToSchema(
  type: ts.IntersectionType,
  ctx: SchemaContext
): JSONSchema {
  const { checker } = ctx;
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  const builtInTypes = new Set([
    "Date",
    "Record",
    "Partial",
    "Required",
    "Pick",
    "Omit",
    "Readonly",
    "Array",
    "Map",
    "Set",
    "Promise",
  ]);

  for (const t of type.types) {
    const props = t.getProperties();

    for (const prop of props) {
      const propName = prop.getName();
      if (propName.startsWith("__")) continue;

      // Skip standard library methods (from Array, Object prototypes)
      // Only check symbol origin, not name - names like "push", "length" could be legitimate properties
      if (isStandardLibrarySymbol(prop)) {
        continue;
      }

      const isOptional = prop.flags & ts.SymbolFlags.Optional;
      const valueDeclaration = prop.valueDeclaration;

      // Check if property type is a type reference
      if (
        valueDeclaration &&
        ts.isPropertySignature(valueDeclaration) &&
        valueDeclaration.type &&
        ts.isTypeReferenceNode(valueDeclaration.type)
      ) {
        const typeNode = valueDeclaration.type;
        const referencedType = checker.getTypeAtLocation(typeNode);
        const symbol = referencedType.aliasSymbol ?? referencedType.getSymbol();

        // Get type name from symbol or directly from the TypeReferenceNode
        let typeName = symbol?.getName();
        if (!typeName && ts.isIdentifier(typeNode.typeName)) {
          typeName = typeNode.typeName.text;
        }

        if (
          typeName &&
          typeName !== "__type" &&
          !typeName.startsWith("__") &&
          !builtInTypes.has(typeName) &&
          !isStandardLibrarySymbol(symbol)
        ) {
          // Get original OpenAPI name from JSDoc if available
          const originalName = getOriginalNameFromTypeNode(typeNode, checker);
          const schemaName = originalName || typeName;

          // Ensure the type alias is registered as a schema
          // Note: typeToSchema handles registration internally, we just trigger it
          if (!ctx.schemas.has(schemaName) && !ctx.visitedTypes.has(typeName)) {
            ctx.visitedTypes.add(typeName);
            typeToSchema(referencedType, { ...ctx, depth: 0 });
            ctx.visitedTypes.delete(typeName);
          }

          properties[propName] = { $ref: `#/components/schemas/${schemaName}` };

          if (!isOptional && !required.includes(propName)) {
            required.push(propName);
          }

          continue;
        }
      }

      const propType = checker.getTypeOfSymbol(prop);

      properties[propName] = typeToSchema(propType, {
        ...ctx,
        depth: ctx.depth + 1,
      });

      if (!isOptional && !required.includes(propName)) {
        required.push(propName);
      }
    }
  }

  const schema: JSONSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}
