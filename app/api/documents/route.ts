import { documentInputSchema } from "@/lib/documents";
import { runDocument } from "@/lib/document-server";
import { AnalysisError } from "@/lib/ai-server";
import { reserveAIRequest } from "@/lib/ai-request-gate";
import { apiHeaders, originAllowed, preflight } from "@/lib/api-http";
export function OPTIONS(request:Request){return preflight(request,"POST");}
export async function POST(request:Request){let release:(()=>void)|undefined;try{
 if(!originAllowed(request))throw new AnalysisError("INVALID_ORIGIN","请求来源不被允许。",403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw new AnalysisError("INVALID_CONTENT_TYPE","请提交有效的文档表单。",415);
 release=reserveAIRequest(request);
 const reader=request.body?.getReader();if(!reader)throw new AnalysisError("INVALID_INPUT","表单内容缺失。",400);let size=0;const chunks:Uint8Array[]=[];const signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);let abort:(()=>void)|undefined;
 const stop=new Promise<never>((_,reject)=>{abort=()=>reject(new AnalysisError("UPLOAD_TIMEOUT","表单读取超时或已中止。",408));signal.addEventListener("abort",abort,{once:true});});
 try{if(signal.aborted)throw new AnalysisError("UPLOAD_TIMEOUT","请求已中止。",408);while(true){const r=await Promise.race([reader.read(),stop]);if(r.done)break;size+=r.value.byteLength;if(size>16000)throw new AnalysisError("INPUT_TOO_LARGE","表单内容超过限制。",413);chunks.push(r.value);}}catch(e){void reader.cancel().catch(()=>{});throw e;}finally{if(abort)signal.removeEventListener("abort",abort);reader.releaseLock();}
 let input:unknown;try{input=JSON.parse(await new Blob(chunks as BlobPart[]).text());}catch{throw new AnalysisError("INVALID_INPUT","表单内容格式不正确。",400);}const parsed=documentInputSchema.safeParse(input);if(!parsed.success)throw new AnalysisError("INVALID_INPUT","请选择有效的国家、文档类型，说明最多300字。",400);
 return apiHeaders(request,Response.json(await runDocument(parsed.data,request.signal)));
 }catch(e){const err=e instanceof AnalysisError?e:new AnalysisError("INVALID_INPUT","文档生成失败，请重试。",400);return apiHeaders(request,Response.json({error:{code:err.code,message:err.message}},{status:err.statusCode}));}finally{release?.();}}
