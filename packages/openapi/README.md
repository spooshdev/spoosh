# @spoosh/openapi

Generate OpenAPI 3.0 specifications from TypeScript API schema types.

**[Documentation](https://spoosh.dev/docs/integrations/openapi)** · **Requirements:** TypeScript >= 5.0

## Installation

```bash
npm install @spoosh/openapi
```

## Usage

### CLI

```bash
# Generate OpenAPI spec from schema
npx spoosh-openapi -s ./src/schema.ts -o openapi.json

# With custom options
npx spoosh-openapi \
  --schema ./src/api-schema.ts \
  --type MyApiSchema \
  --output ./docs/openapi.json \
  --title "My API" \
  --version "2.0.0" \
  --base-url "https://api.example.com"
```

### Schema File

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
      $delete: Endpoint<void>;
    };
  };
  health: {
    $get: Endpoint<{ status: string }>;
  };
};
```

### Generated Output

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "version": "2.0.0"
  },
  "servers": [{ "url": "https://api.example.com" }],
  "paths": {
    "/users": {
      "get": {
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "number" } },
          { "name": "limit", "in": "query", "schema": { "type": "number" } }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/User" }
                }
              }
            }
          }
        }
      },
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserBody" }
            }
          }
        },
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          }
        }
      }
    }
  }
}
```

## CLI Options

| Option       | Alias | Required | Default     | Description                               |
| ------------ | ----- | -------- | ----------- | ----------------------------------------- |
| `--schema`   | `-s`  | Yes      | -           | Path to TypeScript file containing schema |
| `--type`     | `-t`  | No       | `ApiSchema` | Name of the schema type to use            |
| `--output`   | `-o`  | No       | stdout      | Output file path                          |
| `--title`    | -     | No       | -           | API title for OpenAPI info                |
| `--version`  | -     | No       | `1.0.0`     | API version for OpenAPI info              |
| `--base-url` | -     | No       | -           | Base URL for servers array                |

**Short form example:**

```bash
npx spoosh-openapi -s ./src/schema.ts -t MyApiSchema -o openapi.json
```

## Programmatic Usage

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
