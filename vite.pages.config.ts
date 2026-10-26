import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ command }) => {
const localProxy = command === "serve" ? process.env.LOCAL_AI_API_PROXY : undefined;
return {
  root: `${root}github-pages`,
  envDir: root,
  base: "./",
  publicDir: `${root}public`,
  plugins: [react()],
  resolve: { alias: { "@": root } },
  define: {
    "import.meta.env.VITE_STATIC_DEMO": JSON.stringify(localProxy ? "false" : "true"),
    "import.meta.env.VITE_AI_API_BASE_URL": JSON.stringify(localProxy ? "" : process.env.VITE_AI_API_BASE_URL || ""),
    "import.meta.env.VITE_INTERNAL_WORKSPACE_URL": JSON.stringify(localProxy ? "" : "https://donghe-internal.vme0522.chatgpt.site"),
  },
  server: localProxy ? { proxy: { "/api": localProxy } } : undefined,
  css: { postcss: root },
  build: { outDir: `${root}docs`, emptyOutDir: true, target: "es2020" },
};
});
