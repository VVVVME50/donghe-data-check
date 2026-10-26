import { searchInputSchema } from "@/lib/rag-contract";
import { retrieveRegulations } from "@/lib/rag-server";
import { apiHeaders, originAllowed, preflight } from "@/lib/api-http";
import { InputError, readBoundedJSON } from "@/lib/api-input";
const attempts=new Map<string,{start:number;count:number}>();
export function OPTIONS(request:Request){return preflight(request,"POST");}
export async function POST(request:Request){try{if(!originAllowed(request))throw new InputError("请求来源不被允许。",403);const now=Date.now();for(const [key,v] of attempts)if(now-v.start>60000)attempts.delete(key);const ip=request.headers.get("cf-connecting-ip")||"shared";const v=attempts.get(ip)||{start:now,count:0};if(v.count>=40||(!attempts.has(ip)&&attempts.size>=2000))throw new InputError("检索较频繁，请稍后重试。",429);v.count++;attempts.set(ip,v);const parsed=searchInputSchema.safeParse(await readBoundedJSON(request));if(!parsed.success)throw new InputError("请选择支持的国家，检索问题需为2至1000字。");const result=retrieveRegulations(parsed.data.countries,parsed.data.query,parsed.data.limit);return apiHeaders(request,Response.json(result));}catch(e){const error=e instanceof InputError?e:new InputError("检索暂未成功，请重试。",500);return apiHeaders(request,Response.json({error:{code:"SEARCH_FAILED",message:error.message}},{status:error.status}));}}
