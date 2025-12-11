import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  external: ["typescript"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: !options.watch,
  platform: "node",
}));
