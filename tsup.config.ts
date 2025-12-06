import { defineConfig } from "tsup";

const external = ["react", "react-dom"];

const common = {
  external,
  format: ["cjs", "esm"] as const,
  dts: true,
  splitting: false,
  platform: "browser" as const,
};

export default defineConfig((options) => [
  {
    ...common,
    entry: { index: "src/index.ts" },
    outDir: "dist",
    clean: !options.watch,
  },
  {
    ...common,
    entry: { index: "src/next/index.ts" },
    outDir: "dist/next",
  },
]);
