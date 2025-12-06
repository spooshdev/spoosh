import { defineConfig } from "tsup";

const external = ["react", "react-dom"];

export default defineConfig((options) => {
  return {
    entry: ["src/index.ts"],
    outDir: "dist",
    external,
    format: ["cjs", "esm"],
    dts: {
      entry: "src/index.ts",
      output: "dist/index.d.ts",
    },
    clean: !options.watch,
    platform: "browser",
  };
});
