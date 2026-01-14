import ts from "typescript";
import path from "path";
import type { ParsedEndpoint, JSONSchema, OpenAPIParameter } from "../types.js";
import {
  createSchemaContext,
  typeToSchema,
  type SchemaContext,
} from "./type-to-schema.js";

const HTTP_METHODS = ["$get", "$post", "$put", "$patch", "$delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

function isHttpMethod(key: string): key is HttpMethod {
  return HTTP_METHODS.includes(key as HttpMethod);
}

function methodKeyToHttp(
  key: HttpMethod
): "get" | "post" | "put" | "patch" | "delete" {
  return key.slice(1) as "get" | "post" | "put" | "patch" | "delete";
}

export type ParseResult = {
  endpoints: ParsedEndpoint[];
  schemas: Map<string, JSONSchema>;
};

export function parseSchema(
  schemaFilePath: string,
  typeName: string,
  openapiVersion: "3.0.0" | "3.1.0" = "3.1.0"
): ParseResult {
  const absolutePath = path.resolve(schemaFilePath);
  const schemaDir = path.dirname(absolutePath);

  const configPath = ts.findConfigFile(
    schemaDir,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
  };

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (!configFile.error) {
      const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );
      compilerOptions = { ...compilerOptions, ...parsed.options };
    }
  }

  const program = ts.createProgram([absolutePath], compilerOptions);

  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(absolutePath);

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${absolutePath}`);
  }

  const schemaType = findExportedType(sourceFile, typeName, checker);
  if (!schemaType) {
    throw new Error(
      `Could not find exported type '${typeName}' in ${schemaFilePath}`
    );
  }

  const ctx = createSchemaContext(checker, openapiVersion);
  const endpoints: ParsedEndpoint[] = [];

  walkSchemaType(schemaType, "", [], ctx, endpoints, checker);

  // Extract all type aliases from the source file to preserve component schemas
  extractAllTypeAliases(sourceFile, checker, ctx);

  return {
    endpoints,
    schemas: ctx.schemas,
  };
}

function findExportedType(
  sourceFile: ts.SourceFile,
  typeName: string,
  checker: ts.TypeChecker
): ts.Type | undefined {
  const symbol = checker.getSymbolAtLocation(sourceFile);
  if (!symbol) return undefined;

  const exports = checker.getExportsOfModule(symbol);
  const typeSymbol = exports.find((exp) => exp.getName() === typeName);

  if (!typeSymbol) return undefined;

  const declaredType = checker.getDeclaredTypeOfSymbol(typeSymbol);
  return declaredType;
}

function walkSchemaType(
  type: ts.Type,
  currentPath: string,
  pathParams: string[],
  ctx: SchemaContext,
  endpoints: ParsedEndpoint[],
  checker: ts.TypeChecker
): void {
  const properties = type.getProperties();

  for (const prop of properties) {
    const propName = prop.getName();
    const propType = checker.getTypeOfSymbol(prop);

    if (isHttpMethod(propName)) {
      const endpoint = parseEndpoint(
        propType,
        currentPath || "/",
        methodKeyToHttp(propName),
        pathParams,
        ctx
      );
      endpoints.push(endpoint);
    } else if (propName === "_") {
      const paramName = getParamNameFromPath(currentPath);
      const newPath = `${currentPath}/{${paramName}}`;
      walkSchemaType(
        propType,
        newPath,
        [...pathParams, paramName],
        ctx,
        endpoints,
        checker
      );
    } else {
      const newPath = `${currentPath}/${propName}`;
      walkSchemaType(propType, newPath, pathParams, ctx, endpoints, checker);
    }
  }
}

function getParamNameFromPath(currentPath: string): string {
  const segments = currentPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (lastSegment) {
    const singular = lastSegment.endsWith("s")
      ? lastSegment.slice(0, -1)
      : lastSegment;
    return `${singular}Id`;
  }

  return "id";
}

function parseEndpoint(
  type: ts.Type,
  path: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  pathParams: string[],
  ctx: SchemaContext
): ParsedEndpoint {
  if (type.isIntersection()) {
    for (const t of type.types) {
      if (isEndpointStructure(t)) {
        return parseEndpointType(type, path, method, pathParams, ctx);
      }
    }
  }

  if (isEndpointStructure(type)) {
    return parseEndpointType(type, path, method, pathParams, ctx);
  }

  return {
    path,
    method,
    responseSchema: typeToSchema(type, ctx),
    pathParams,
  };
}

function isEndpointStructure(type: ts.Type): boolean {
  const props = type.getProperties();
  const propNames = new Set(props.map((p) => p.getName()));

  if (!propNames.has("data")) {
    return false;
  }

  propNames.delete("data");
  propNames.delete("body");
  propNames.delete("error");
  propNames.delete("query");
  propNames.delete("formData");

  const remainingProps = [...propNames].filter(
    (name) => !name.startsWith("__@") && !name.includes("Brand")
  );

  return remainingProps.length === 0;
}

function parseEndpointType(
  type: ts.Type,
  pathStr: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  pathParams: string[],
  ctx: SchemaContext
): ParsedEndpoint {
  const { checker } = ctx;

  let dataType: ts.Type | undefined;
  let bodyType: ts.Type | undefined;
  let errorType: ts.Type | undefined;
  let queryType: ts.Type | undefined;
  let formDataType: ts.Type | undefined;

  const typesToCheck = type.isIntersection() ? type.types : [type];

  for (const t of typesToCheck) {
    const props = t.getProperties();
    for (const prop of props) {
      const name = prop.getName();
      if (name === "data") {
        dataType = checker.getTypeOfSymbol(prop);
      } else if (name === "body") {
        bodyType = checker.getTypeOfSymbol(prop);
      } else if (name === "error") {
        errorType = checker.getTypeOfSymbol(prop);
      } else if (name === "query") {
        queryType = checker.getTypeOfSymbol(prop);
      } else if (name === "formData") {
        formDataType = checker.getTypeOfSymbol(prop);
      }
    }
  }

  const endpoint: ParsedEndpoint = {
    path: pathStr,
    method,
    responseSchema: dataType ? typeToSchema(dataType, ctx) : {},
    pathParams,
  };

  if (formDataType && !(formDataType.flags & ts.TypeFlags.Never)) {
    endpoint.requestBodySchema = formDataTypeToSchema(formDataType, ctx);
    endpoint.requestBodyContentType = "multipart/form-data";
  } else if (bodyType && !(bodyType.flags & ts.TypeFlags.Never)) {
    endpoint.requestBodySchema = typeToSchema(bodyType, ctx);
    endpoint.requestBodyContentType = "application/json";
  }

  if (queryType && !(queryType.flags & ts.TypeFlags.Never)) {
    endpoint.queryParams = queryTypeToParams(queryType, ctx);
  }

  if (
    errorType &&
    !(errorType.flags & ts.TypeFlags.Never) &&
    !(errorType.flags & ts.TypeFlags.Unknown)
  ) {
    endpoint.errorSchema = typeToSchema(errorType, ctx);
  }

  return endpoint;
}

function queryTypeToParams(
  queryType: ts.Type,
  ctx: SchemaContext
): OpenAPIParameter[] {
  const { checker } = ctx;
  const params: OpenAPIParameter[] = [];

  const props = queryType.getProperties();
  for (const prop of props) {
    const propName = prop.getName();
    const propType = checker.getTypeOfSymbol(prop);
    const isOptional = !!(prop.flags & ts.SymbolFlags.Optional);

    params.push({
      name: propName,
      in: "query",
      required: !isOptional,
      schema: typeToSchema(propType, ctx),
    });
  }

  return params;
}

function formDataTypeToSchema(
  formDataType: ts.Type,
  ctx: SchemaContext
): JSONSchema {
  const { checker } = ctx;
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  const props = formDataType.getProperties();
  for (const prop of props) {
    const propName = prop.getName();
    const propType = checker.getTypeOfSymbol(prop);
    const isOptional = !!(prop.flags & ts.SymbolFlags.Optional);

    const typeName = checker.typeToString(propType);
    if (typeName.includes("File") || typeName.includes("Blob")) {
      properties[propName] = { type: "string", format: "binary" };
    } else if (propType.isUnion()) {
      const hasFile = propType.types.some((t) => {
        const name = checker.typeToString(t);
        return name.includes("File") || name.includes("Blob");
      });
      if (hasFile) {
        properties[propName] = { type: "string", format: "binary" };
      } else {
        properties[propName] = typeToSchema(propType, ctx);
      }
    } else {
      properties[propName] = typeToSchema(propType, ctx);
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

function extractAllTypeAliases(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  ctx: SchemaContext
): void {
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

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;

      // Skip built-in types and already-extracted types
      if (builtInTypes.has(typeName) || ctx.schemas.has(typeName)) {
        return;
      }

      // Skip main schema type (ApiSchema, TestSchema, etc.)
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        return;
      }

      const originalName = getOriginalNameFromJSDoc(node);
      const schemaName = originalName || typeName;

      const typeNode = node.type;
      if (ts.isTypeReferenceNode(typeNode)) {
        const referencedType = checker.getTypeAtLocation(typeNode);
        const referencedSymbol =
          referencedType.aliasSymbol ?? referencedType.getSymbol();
        const referencedName = referencedSymbol?.getName();

        if (
          referencedName &&
          referencedName !== "__type" &&
          !referencedName.startsWith("__") &&
          !builtInTypes.has(referencedName) &&
          referencedName !== typeName
        ) {
          const referencedDecl = referencedSymbol?.getDeclarations()?.[0];

          if (referencedDecl && ts.isTypeAliasDeclaration(referencedDecl)) {
            const refOriginalName = getOriginalNameFromJSDoc(referencedDecl);
            const refSchemaName = refOriginalName || referencedName;
            ctx.schemas.set(schemaName, {
              $ref: `#/components/schemas/${refSchemaName}`,
            });
            return;
          }
        }
      }

      const type = checker.getTypeAtLocation(node);
      const schema = typeToSchema(type, { ...ctx, depth: 0 });

      if (Object.keys(schema).length > 0 && !schema.$ref) {
        ctx.schemas.set(schemaName, schema);
      }
    }
  });
}

function getOriginalNameFromJSDoc(
  node: ts.TypeAliasDeclaration
): string | undefined {
  const jsDocTags = ts.getJSDocTags(node);
  for (const tag of jsDocTags) {
    if (tag.tagName.text === "openapiName" && tag.comment) {
      return typeof tag.comment === "string"
        ? tag.comment
        : tag.comment.map((c) => c.text).join("");
    }
  }
  return undefined;
}
