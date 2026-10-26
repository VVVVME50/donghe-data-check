import { libraryStatus } from "@/lib/rag-server";
import { apiHeaders, originAllowed, preflight } from "@/lib/api-http";
export function OPTIONS(request:Request){return preflight(request,"GET");}
export function GET(request:Request){if(!originAllowed(request))return apiHeaders(request,Response.json({error:{code:"INVALID_ORIGIN",message:"请求来源不被允许。"}},{status:403}));return apiHeaders(request,Response.json(libraryStatus()));}
