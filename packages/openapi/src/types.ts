export type JSONSchema = {
  type?: string | string[];
  items?: JSONSchema;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  $ref?: string;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  enum?: (string | number | boolean | null)[];
  const?: unknown;
  additionalProperties?: boolean | JSONSchema;
  nullable?: boolean;
  format?: string;
  description?: string;
};

export type OpenAPIRequestBody = {
  required?: boolean;
  content: {
    "application/json"?: {
      schema: JSONSchema;
    };
    "multipart/form-data"?: {
      schema: JSONSchema;
    };
    "application/x-www-form-urlencoded"?: {
      schema: JSONSchema;
    };
  };
};

export type OpenAPIOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<
    string,
    {
      description: string;
      content?: {
        "application/json": {
          schema: JSONSchema;
        };
      };
    }
  >;
};

export type OpenAPIParameter = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  schema: JSONSchema;
  description?: string;
};

export type OpenAPIPathItem = {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
};

export type OpenAPITag = {
  name: string;
  description?: string;
};

export type OpenAPISpec = {
  openapi: "3.0.0" | "3.1.0";
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  tags?: OpenAPITag[];
  paths: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, JSONSchema>;
  };
};

export type ParsedEndpoint = {
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  responseSchema: JSONSchema;
  requestBodySchema?: JSONSchema;
  requestBodyContentType?:
    | "application/json"
    | "multipart/form-data"
    | "application/x-www-form-urlencoded";
  queryParams?: OpenAPIParameter[];
  errorSchema?: JSONSchema;
  pathParams: string[];
};

export type CLIOptions = {
  schema: string;
  type: string;
  output?: string;
  title?: string;
  version?: string;
  baseUrl?: string;
};
