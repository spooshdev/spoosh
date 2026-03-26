import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [solid(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      "@devtool": resolve(__dirname, "../../packages/devtool/src"),
      "@panel": resolve(__dirname, "src/panel"),
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
