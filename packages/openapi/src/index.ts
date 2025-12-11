#!/usr/bin/env node

import { program } from "commander";
import fs from "fs";
import { parseSchema } from "./parser.js";
import { generateOpenAPISpec } from "./generator.js";

program
  .name("enlace-openapi")
  .description("Generate OpenAPI spec from TypeScript API schema")
  .requiredOption("-s, --schema <path>", "Path to TypeScript file containing the schema type")
  .option("-t, --type <name>", "Name of the schema type to use", "ApiSchema")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .option("--title <title>", "API title for OpenAPI info")
  .option("--version <version>", "API version for OpenAPI info", "1.0.0")
  .option("--base-url <url>", "Base URL for servers array")
  .action((options) => {
    try {
      const { endpoints, schemas } = parseSchema(options.schema, options.type);

      const spec = generateOpenAPISpec(endpoints, schemas, {
        title: options.title,
        version: options.version,
        baseUrl: options.baseUrl,
      });

      const output = JSON.stringify(spec, null, 2);

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`OpenAPI spec written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

export { parseSchema } from "./parser.js";
export { generateOpenAPISpec } from "./generator.js";
export type * from "./types.js";
