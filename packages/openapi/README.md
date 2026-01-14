# @spoosh/openapi

Bidirectional conversion between Spoosh TypeScript schemas and OpenAPI 3.0/3.1 specifications.

**[Documentation](https://spoosh.dev/docs/integrations/openapi)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/openapi
```

## Features

- **Export**: Generate OpenAPI 3.0 or 3.1 specs from TypeScript Spoosh schemas
- **Import**: Generate TypeScript Spoosh schemas from OpenAPI 3.0/3.1 specs
- **JSON & YAML**: Support for both JSON and YAML OpenAPI formats
- **Type-safe**: Automatic detection of endpoint types (Endpoint, EndpointWithQuery, EndpointWithFormData)
- **Error Types**: Extract error types from 4xx/5xx responses
- **JSDoc Preservation**: Convert OpenAPI descriptions to TypeScript JSDoc comments
- **File Uploads**: Automatic File type detection for binary formats

## Usage

### Export: Spoosh → OpenAPI

Generate OpenAPI specifications from your TypeScript Spoosh schema:

```bash
# Basic usage
npx spoosh-openapi export -s ./src/schema.ts -o openapi.json

# With custom options
npx spoosh-openapi export \
  --schema ./src/api-schema.ts \
  --type MyApiSchema \
  --output ./docs/openapi.json \
  --title "My API" \
  --version "2.0.0" \
  --base-url "https://api.example.com"
```

#### Schema File

```typescript
// src/schema.ts
import type { Endpoint, EndpointWithQuery } from "@spoosh/core";

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserBody {
  name: string;
  email: string;
}

export type ApiSchema = {
  users: {
    $get: EndpointWithQuery<User[], { page?: number; limit?: number }>;
    $post: Endpoint<User, CreateUserBody>;
    _: {
      $get: Endpoint<User>;
      $put: Endpoint<User, Partial<CreateUserBody>>;
      $delete: void;
    };
  };
  health: {
    $get: { status: string };
  };
};
```

### Import: OpenAPI → Spoosh

Generate TypeScript Spoosh schemas from existing OpenAPI specifications:

```bash
# Import from JSON
npx spoosh-openapi import openapi.json -o ./src/schema.ts --include-imports

# Import from YAML
npx spoosh-openapi import openapi.yaml -o ./src/schema.ts --include-imports

# Custom options
npx spoosh-openapi import \
  ./docs/openapi.json \
  --output ./src/api-schema.ts \
  --type-name MyApiSchema \
  --include-imports \
  --jsdoc
```

#### Input: OpenAPI Spec

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/posts": {
      "get": {
        "description": "Retrieve all posts",
        "parameters": [
          { "name": "userId", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Post" }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Post": {
        "type": "object",
        "required": ["id", "title"],
        "properties": {
          "id": { "type": "integer" },
          "title": { "type": "string" },
          "desc": { "type": "string" }
        }
      }
    }
  }
}
```

#### Generated Output

```typescript
import type { EndpointWithQuery } from "@spoosh/core";

type Post = {
  id: number;
  title: string;
  desc?: string;
};

type ApiSchema = {
  posts: {
    /** Retrieve all posts */
    $get: EndpointWithQuery<Post[], { userId?: number }>;
  };
};
```

## CLI Options

### Export Command

```bash
npx spoosh-openapi export [options]
```

| Option              | Alias | Required | Default     | Description                               |
| ------------------- | ----- | -------- | ----------- | ----------------------------------------- |
| `--schema`          | `-s`  | Yes      | -           | Path to TypeScript file containing schema |
| `--type`            | `-t`  | No       | `ApiSchema` | Name of the schema type to use            |
| `--output`          | `-o`  | No       | stdout      | Output file path                          |
| `--title`           | -     | No       | -           | API title for OpenAPI info                |
| `--version`         | -     | No       | `1.0.0`     | API version for OpenAPI info              |
| `--base-url`        | -     | No       | -           | Base URL for servers array                |
| `--openapi-version` | -     | No       | `3.1.0`     | OpenAPI spec version (3.0.0 or 3.1.0)     |

### Import Command

```bash
npx spoosh-openapi import <input> [options]
```

| Option              | Alias | Required | Default     | Description                          |
| ------------------- | ----- | -------- | ----------- | ------------------------------------ |
| `<input>`           | -     | Yes      | -           | Path to OpenAPI spec (JSON or YAML)  |
| `--output`          | `-o`  | Yes      | -           | Output TypeScript file path          |
| `--type-name`       | `-t`  | No       | `ApiSchema` | Schema type name                     |
| `--include-imports` | -     | No       | `false`     | Include Spoosh type imports          |
| `--jsdoc`           | -     | No       | `false`     | Include JSDoc comments from OpenAPI descriptions and summaries|

## Programmatic Usage

### Export API

```typescript
import { parseSchema, generateOpenAPISpec } from "@spoosh/openapi";

const { endpoints, schemas } = parseSchema("./src/schema.ts", "ApiSchema");

const spec = generateOpenAPISpec(endpoints, schemas, {
  title: "My API",
  version: "1.0.0",
  baseUrl: "https://api.example.com",
});

console.log(JSON.stringify(spec, null, 2));
```

### Import API

```typescript
import { importOpenAPISpec, loadOpenAPISpec, generateSpooshSchema } from "@spoosh/openapi";

// High-level API (load + generate)
const tsCode = importOpenAPISpec("./openapi.json", {
  typeName: "ApiSchema",
  includeImports: true,
  jsdoc: true,
});

// Or use low-level APIs
const spec = loadOpenAPISpec("./openapi.json");
const schema = generateSpooshSchema(spec, {
  typeName: "ApiSchema",
  includeImports: true,
});

console.log(schema);
```

## Type Detection

The import feature automatically detects the appropriate Spoosh endpoint type:

| OpenAPI Pattern | Spoosh Type |
| --------------- | ----------- |
| Query parameters | `EndpointWithQuery<TData, TQuery, TError>` |
| `multipart/form-data` request body | `EndpointWithFormData<TData, TFormData, TError>` |
| `application/json` request body | `Endpoint<TData, TBody, TError>` |
| No response body (204) | `void` |
| Simple response only | `TData` |

### Error Type Extraction

Error types are automatically extracted from 4xx and 5xx response schemas. If a response only has a description without a schema, no error type is added.

```json
{
  "responses": {
    "200": {
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/User" }
        }
      }
    },
    "400": {
      "description": "Bad request"
    },
    "500": {
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "system_message": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

Generated types:
```typescript
// Only 500 has a schema, so only that is included
$post: Endpoint<User, CreateUserBody, { system_message?: string }>

// If no error responses have schemas, no error type is added
$get: User
```

Multiple error schemas are automatically unioned:
```typescript
// 400 and 500 both have schemas
$post: Endpoint<User, Body, { error?: string } | { system_message?: string }>
```

## License

MIT
