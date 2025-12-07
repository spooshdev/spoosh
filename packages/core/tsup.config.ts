import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  external: ["query-string"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  clean: !options.watch,
  platform: "browser",
}));
