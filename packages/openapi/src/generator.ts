import type {
  OpenAPISpec,
  OpenAPIPathItem,
  OpenAPIOperation,
  ParsedEndpoint,
  JSONSchema,
} from "./types.js";

export type GeneratorOptions = {
  title?: string;
  version?: string;
  description?: string;
  baseUrl?: string;
};

export function generateOpenAPISpec(
  endpoints: ParsedEndpoint[],
  schemas: Map<string, JSONSchema>,
  options: GeneratorOptions = {}
): OpenAPISpec {
  const { title = "API", version = "1.0.0", description, baseUrl } = options;

  const paths: Record<string, OpenAPIPathItem> = {};

  for (const endpoint of endpoints) {
    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {};
    }

    const pathItem = paths[endpoint.path]!;
    const operation = createOperation(endpoint);

    pathItem[endpoint.method] = operation;

    if (endpoint.pathParams.length > 0 && !pathItem.parameters) {
      pathItem.parameters = endpoint.pathParams.map((param) => ({
        name: param,
        in: "path",
        required: true,
        schema: { type: "string" },
      }));
    }
  }

  const spec: OpenAPISpec = {
    openapi: "3.0.0",
    info: {
      title,
      version,
    },
    paths,
  };

  if (description) {
    spec.info.description = description;
  }

  if (baseUrl) {
    spec.servers = [{ url: baseUrl }];
  }

  if (schemas.size > 0) {
    spec.components = {
      schemas: Object.fromEntries(schemas),
    };
  }

  return spec;
}

function createOperation(endpoint: ParsedEndpoint): OpenAPIOperation {
  const operation: OpenAPIOperation = {
    responses: {
      "200": {
        description: "Successful response",
      },
    },
  };

  if (hasContent(endpoint.responseSchema)) {
    operation.responses["200"]!.content = {
      "application/json": {
        schema: endpoint.responseSchema,
      },
    };
  }

  if (endpoint.queryParams && endpoint.queryParams.length > 0) {
    operation.parameters = endpoint.queryParams;
  }

  if (endpoint.requestBodySchema && hasContent(endpoint.requestBodySchema)) {
    const contentType = endpoint.requestBodyContentType || "application/json";
    operation.requestBody = {
      required: true,
      content: {
        [contentType]: {
          schema: endpoint.requestBodySchema,
        },
      },
    };
  }

  if (endpoint.errorSchema && hasContent(endpoint.errorSchema)) {
    operation.responses["400"] = {
      description: "Error response",
      content: {
        "application/json": {
          schema: endpoint.errorSchema,
        },
      },
    };
  }

  return operation;
}

function hasContent(schema: JSONSchema): boolean {
  return Object.keys(schema).length > 0;
}
