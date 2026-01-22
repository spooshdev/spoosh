# @spoosh/plugin-path-case

Path case transformation plugin for Spoosh - write camelCase in TypeScript, send kebab-case (or snake_case) to your API.

**[Documentation](https://spoosh.dev/docs/plugins/path-case)** · **Requirements:** TypeScript >= 5.0 · **Peer Dependencies:** `@spoosh/core`

## The Problem

When your API uses kebab-case or snake_case URLs, you're forced to write ugly bracket notation:

```typescript
// Ugly bracket notation
api["user-profiles"]["profile-settings"].$get();
api["blog-posts"](":postId")["related-articles"].$get();
```

## The Solution

With `pathCasePlugin`, write clean camelCase:

```typescript
// Clean dot notation
api.userProfiles.profileSettings.$get();
api.blogPosts(":postId").relatedArticles.$get();
// HTTP: GET /blog-posts/123/related-articles
```

## Installation

```bash
npm install @spoosh/plugin-path-case
```

## Usage

```typescript
import { Spoosh } from "@spoosh/core";
import { createReactSpoosh } from "@spoosh/react";
import { CamelCaseKeys, pathCasePlugin } from "@spoosh/plugin-path-case";
import type { ApiSchema } from "./generated/api-schema";

// 1. Wrap your schema type with CamelCaseKeys
// 2. Add pathCasePlugin with your target case
const client = new Spoosh<CamelCaseKeys<ApiSchema>, Error>("/api").use([
  pathCasePlugin({ targetCase: "kebab" }),
]);

const { useRead, useWrite } = createReactSpoosh(client);

// Now use camelCase everywhere!
useRead((api) => api.blogPosts(postId).relatedArticles.$get());
```

## Options

### Plugin Config

| Option       | Type                                                    | Default  | Description                              |
| ------------ | ------------------------------------------------------- | -------- | ---------------------------------------- |
| `targetCase` | `"kebab" \| "snake" \| "pascal" \| "camel" \| Function` | Required | Target case for HTTP URLs                |
| `exclude`    | `string[]`                                              | `[]`     | Segments to skip (e.g., `["v1", "api"]`) |

### Per-Request Options

| Option       | Type                  | Description           |
| ------------ | --------------------- | --------------------- |
| `targetCase` | Same as plugin config | Override target case  |
| `exclude`    | `string[]`            | Override exclude list |

## Type Utilities

| Utility          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `CamelCaseKeys`  | Transform schema keys from kebab/snake to camel |
| `KebabCaseKeys`  | Transform schema keys to kebab-case             |
| `SnakeCaseKeys`  | Transform schema keys to snake_case             |
| `PascalCaseKeys` | Transform schema keys to PascalCase             |
