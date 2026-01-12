import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  external: ["@spoosh/core", "@spoosh/plugin-invalidation"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: !options.watch,
  platform: "browser",
}));
