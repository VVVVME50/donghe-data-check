/** Public API origin only. Provider credentials belong on the API server. */
const buildEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;
const apiBase = buildEnv?.VITE_AI_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

if (apiBase) {
  const url = new URL(apiBase);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("AI API 地址必须是无凭据、无查询参数的 HTTPS 服务地址。");
  }
}

export const canCheckApi = buildEnv?.VITE_STATIC_DEMO !== "true" || !!apiBase;
export const apiCredentials: RequestCredentials = apiBase ? "omit" : "same-origin";
export const internalWorkspaceUrl = buildEnv?.VITE_INTERNAL_WORKSPACE_URL || "";
export const isInternalWorkspace = buildEnv?.VITE_INTERNAL_MODE === "true";
export function aiEndpoint(path: "/api/status" | "/api/analyze" | "/api/documents" | "/api/knowledge/status" | "/api/knowledge/search") {
  return `${apiBase}${path}`;
}
