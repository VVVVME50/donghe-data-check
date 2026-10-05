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
  define: {
    "import.meta.env.VITE_STATIC_DEMO": JSON.stringify("true"),
    "import.meta.env.VITE_AI_API_BASE_URL": JSON.stringify(process.env.VITE_AI_API_BASE_URL || "https://donghe-data-check.vme0522.chatgpt.site"),
  },
  css: { postcss: root },
  build: { outDir: `${root}docs`, emptyOutDir: true, target: "es2020" },
});
