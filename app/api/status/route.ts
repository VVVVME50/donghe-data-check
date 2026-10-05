import { status } from "@/lib/ai-server";
import { apiHeaders, originAllowed, preflight } from "@/lib/api-http";
export function GET(request:Request){return apiHeaders(request,originAllowed(request)?Response.json(status()):Response.json({error:{code:"INVALID_ORIGIN",message:"请求来源不被允许。"}},{status:403}));}
export function OPTIONS(request:Request){return preflight(request,"GET");}
