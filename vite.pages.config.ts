import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  root: `${root}pages`,
  envDir: root,
  base: "./",
  publicDir: `${root}public`,
  plugins: [react()],
  resolve: { alias: { "@": root } },
  define: { "import.meta.env.VITE_STATIC_DEMO": JSON.stringify("true") },
  css: { postcss: root },
  build: { outDir: `${root}docs`, emptyOutDir: true, target: "es2020" },
});
