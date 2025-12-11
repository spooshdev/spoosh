# enlace-openapi

Generate OpenAPI 3.0 specifications from TypeScript API schema types.

## Installation

```bash
pnpm add enlace-openapi
```

## Usage

### CLI

```bash
enlace-openapi --schema ./types/APISchema.ts --output ./openapi.json
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path>` | Path to TypeScript schema file | (required) |
| `-t, --type <name>` | Schema type name to export | `ApiSchema` |
| `-o, --output <path>` | Output file path | stdout |
| `--title <title>` | API title | `API` |
| `--version <version>` | API version | `1.0.0` |
| `--base-url <url>` | Base URL for servers array | - |

### Example

```bash
enlace-openapi \
  --schema ./types/APISchema.ts \
  --type ApiSchema \
  --title "My API" \
  --version "2.0.0" \
  --base-url "https://api.example.com" \
  --output ./openapi.json
```

## Schema Format

Define your API schema using the `Endpoint` type from `enlace-core`:

```typescript
import { Endpoint } from "enlace-core";

type User = {
  id: string;
  name: string;
  email: string;
};

type CreateUserBody = {
  name: string;
  email: string;
};

type ValidationError = {
  field: string;
  message: string;
};

export type ApiSchema = {
  users: {
    $get: Endpoint<User[]>;
    $post: Endpoint<User, CreateUserBody, ValidationError>;
    _: {
      $get: Endpoint<User>;
      $put: Endpoint<User, Partial<CreateUserBody>>;
      $delete: Endpoint<{ success: boolean }>;
    };
  };
};
```

This generates:

```json
{
  "openapi": "3.0.0",
  "info": { "title": "My API", "version": "2.0.0" },
  "servers": [{ "url": "https://api.example.com" }],
  "paths": {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": { "type": "array", "items": { "$ref": "#/components/schemas/User" } }
              }
            }
          }
        }
      },
      "post": {
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserBody" }
            }
          }
        },
        "responses": {
          "200": { "..." },
          "400": {
            "description": "Error response",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ValidationError" }
              }
            }
          }
        }
      }
    },
    "/users/{userId}": {
      "parameters": [{ "name": "userId", "in": "path", "required": true, "schema": { "type": "string" } }],
      "get": { "..." },
      "put": { "..." },
      "delete": { "..." }
    }
  },
  "components": {
    "schemas": {
      "User": { "..." },
      "CreateUserBody": { "..." },
      "ValidationError": { "..." }
    }
  }
}
```

## Endpoint Type

The `Endpoint` type accepts three generic parameters:

```typescript
Endpoint<TData, TBody?, TError?>
```

| Parameter | Description |
|-----------|-------------|
| `TData` | Response data type (required) |
| `TBody` | Request body type (optional) |
| `TError` | Error response type (optional) |

## Path Parameters

Use `_` to define dynamic path segments:

```typescript
type ApiSchema = {
  users: {
    _: {
      // /users/{userId}
      posts: {
        _: {
          // /users/{userId}/posts/{postId}
          $get: Endpoint<Post>;
        };
      };
    };
  };
};
```

Parameter names are auto-generated from the parent segment (e.g., `users` → `userId`, `posts` → `postId`).

## Supported Types

- Primitives: `string`, `number`, `boolean`, `null`
- Literals: `"active"`, `42`, `true`
- Arrays: `User[]`, `Array<User>`
- Objects: `{ name: string; age: number }`
- Optional properties: `{ name?: string }`
- Nullable: `string | null`
- Unions: `"pending" | "active" | "inactive"`
- Intersections: `BaseUser & { role: string }`
- Date: converted to `{ type: "string", format: "date-time" }`
- Named types: extracted to `#/components/schemas`

## Programmatic API

### Next.js + Swagger UI Example

```typescript
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { parseSchema, generateOpenAPISpec } from "enlace-openapi";

const spec = (() => {
  const { endpoints, schemas } = parseSchema(
    "./APISchema.ts",
    "ApiSchema"
  );
  return generateOpenAPISpec(endpoints, schemas, {
    title: "My API",
    version: "1.0.0",
    baseUrl: "https://api.example.com",
  });
})();

const DocsPage = () => {
  return <SwaggerUI spec={spec} />;
};

export default DocsPage;
```

## Viewing the OpenAPI Spec

Use [Swagger UI](https://swagger.io/tools/swagger-ui/) or [Swagger Editor](https://editor.swagger.io/) to visualize the generated spec.

Quick local preview with Docker:

```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.json -v $(pwd)/openapi.json:/openapi.json swaggerapi/swagger-ui
```

Then open http://localhost:8080
