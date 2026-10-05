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
export function aiEndpoint(path: "/api/status" | "/api/analyze") {
  return `${apiBase}${path}`;
}
