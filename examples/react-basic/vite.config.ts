import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { getSpooshAliases } from "../shared/vite-aliases";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: getSpooshAliases(),
  },
});
