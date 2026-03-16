import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      "@devtool": resolve(__dirname, "../../packages/devtool/src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, "src/devtools/devtools.html"),
        panel: resolve(__dirname, "src/devtools/panel.html"),
        popup: resolve(__dirname, "src/popup/popup.html"),
      },
    },
  },
});
