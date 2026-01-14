import type { OpenAPISpec } from "../types.js";

/** Options for importing OpenAPI specs */
export type ImportOptions = {
  /** Name for the generated schema type */
  typeName?: string;

  /** Include import statements for Spoosh types */
  includeImports?: boolean;

  /** Include JSDoc comments from descriptions */
  jsdoc?: boolean;
};

/** Context for conversion operations */
export type ConversionContext = {
  /** Named types extracted from components.schemas */
  namedTypes: Map<string, string>;

  /** Track refs to avoid circular dependencies */
  refs: Set<string>;

  /** Options for conversion */
  options: ImportOptions;

  /** Original OpenAPI spec for reference */
  spec: OpenAPISpec;
};

/** Information about an endpoint's type */
export type EndpointTypeInfo = {
  /** Data type (response) */
  dataType: string;

  /** Body type (JSON body) */
  bodyType?: string;

  /** Query type */
  queryType?: string;

  /** FormData type */
  formDataType?: string;

  /** URL-encoded type */
  urlEncodedType?: string;

  /** Error type */
  errorType?: string;

  /** Description from OpenAPI */
  description?: string;

  /** Is void response (204 No Content) */
  isVoid?: boolean;
};

/** Parsed path segment */
export type PathSegment = {
  /** Segment value */
  value: string;

  /** Is this a path parameter? */
  isParameter: boolean;

  /** Original parameter name from {paramName} */
  parameterName?: string;
};

/** Nested endpoint structure */
export type NestedEndpointStructure = {
  [key: string]: NestedEndpointStructure | EndpointTypeInfo;
};

/** Result of schema-to-type conversion */
export type TypeConversionResult = {
  /** Generated TypeScript type string */
  typeString: string;

  /** Whether this type needs to be imported */
  needsImport?: boolean;
};
