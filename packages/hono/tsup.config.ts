import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  external: ["hono", "enlace-core"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: !options.watch,
}));
