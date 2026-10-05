import { settings } from "./ai-server";

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === new URL(request.url).origin) return true;
  const allowed = (settings().AI_ALLOWED_ORIGINS ?? "")
    .split(",").map(value => value.trim()).filter(Boolean);
  return allowed.includes(origin);
}

export function apiHeaders(request: Request, response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.append("Vary", "Origin");
  const origin = request.headers.get("origin");
  if (origin && originAllowed(request)) response.headers.set("Access-Control-Allow-Origin", origin);
  return response;
}

export function preflight(request: Request, method: "GET" | "POST") {
  const requestedMethod = request.headers.get("access-control-request-method");
  const requestedHeaders = (request.headers.get("access-control-request-headers") ?? "")
    .toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
  if (!originAllowed(request) || (requestedMethod && requestedMethod !== method) ||
      requestedHeaders.some(header => header !== "content-type")) {
    return apiHeaders(request, new Response(null, {status: 403}));
  }
  const response = apiHeaders(request, new Response(null, {status: 204}));
  response.headers.set("Access-Control-Allow-Methods", `${method}, OPTIONS`);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "600");
  return response;
}
