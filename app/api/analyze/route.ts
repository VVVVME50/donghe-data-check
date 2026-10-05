import { profileSchema } from "@/lib/assessment";
import { AnalysisError, runAnalysis } from "@/lib/ai-server";
let active=0;
const MAX_BODY=16*1024*1024;
function error(code:string,message:string,status:number){return Response.json({error:{code,message}},{status,headers:{"Cache-Control":"no-store"}});}
async function boundedForm(request:Request){
 const declared=Number(request.headers.get("content-length")||0);if(declared>MAX_BODY)throw new AnalysisError("UPLOAD_TOO_LARGE","上传材料总大小超过限制。",413);
 const reader=request.body?.getReader();if(!reader)throw new AnalysisError("INVALID_INPUT","请提供业务材料。",400);
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new AnalysisError("UPLOAD_TOO_LARGE","上传材料总大小超过限制。",413);}chunks.push(value);}
 const blob=new Blob(chunks as BlobPart[]);return new Response(blob,{headers:{"Content-Type":request.headers.get("content-type")||""}}).formData();
}
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return error("INVALID_ORIGIN","请求来源不被允许。",403);
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))return error("INVALID_CONTENT_TYPE","请通过业务材料表单提交。",415);
 if(active>=1)return error("BUSY","当前分析请求较多，请稍后重试。",429);
 active++;
 try{
 const form=await boundedForm(request);let raw:unknown;try{raw=JSON.parse(String(form.get("profile")));}catch{return error("INVALID_PROFILE","业务画像不完整，请返回修改。",400);}
 const parsed=profileSchema.safeParse(raw);if(!parsed.success)return error("INVALID_PROFILE","请选择支持的国家、业务类型和数据回传情况。",400);
 const value=form.get("description");if(value!==null&&typeof value!=="string")return error("INVALID_INPUT","业务描述格式不正确。",400);
 const description=String(value||"").trim();const length=Array.from(description).length;
 if(length>2000||(length>0&&length<10))return error("INVALID_DESCRIPTION","业务描述需为 10–2000 字。",400);
 const files=form.getAll("images");if(files.length>3)return error("TOO_MANY_IMAGES","最多上传 3 张图片。",400);
 if(!description&&!files.length)return error("MATERIAL_REQUIRED","请提供业务描述或至少一张图片。",400);
 const images:{mime:string;base64:string}[]=[];
 for(const entry of files){if(!(entry instanceof File)||!entry.size||entry.size>5*1024*1024)return error("INVALID_IMAGE","图片不能为空，单张不得超过 5 MB。",400);const buffer=new Uint8Array(await entry.arrayBuffer());const png=[137,80,78,71,13,10,26,10].every((n,i)=>buffer[i]===n);const jpg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255;const mime=png?"image/png":jpg?"image/jpeg":null;if(!mime||entry.type!==mime)return error("INVALID_IMAGE","仅支持有效的 JPG 或 PNG 图片。",400);let binary="";for(let i=0;i<buffer.length;i+=8192)binary+=String.fromCharCode(...buffer.subarray(i,i+8192));images.push({mime,base64:btoa(binary)});}
 const report=await runAnalysis(parsed.data,description,images,request.signal);
 return Response.json(report,{headers:{"Cache-Control":"no-store"}});
 }catch(e){return e instanceof AnalysisError?error(e.code,e.message,e.statusCode):error("INVALID_INPUT","材料无法读取，请检查后重试。",400);}finally{active--;}
}
