import { build } from "vite";
import { writeFile } from "node:fs/promises";

await build({ configFile: "vite.pages.config.ts" });
await writeFile(new URL("../docs/.nojekyll", import.meta.url), "");
