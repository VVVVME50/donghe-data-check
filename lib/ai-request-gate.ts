import { AnalysisError } from "./ai-server";
// Per-worker guard shared by all paid-provider routes. Deployment-wide limits remain a hosting concern.
let active=0;
const attempts=new Map<string,{start:number;count:number}>();
export function reserveAIRequest(request:Request){const now=Date.now(),windowMs=600000;for(const [key,v] of attempts)if(now-v.start>=windowMs)attempts.delete(key);const ip=request.headers.get("cf-connecting-ip")||"shared";let v=attempts.get(ip);if(!v){if(attempts.size>=2000)throw new AnalysisError("RATE_LIMITED","服务当前较忙，请稍后重试。",429);v={start:now,count:0};attempts.set(ip,v);}if(v.count>=8)throw new AnalysisError("RATE_LIMITED","请求次数较多，请十分钟后重试。",429);v.count++;if(active>=1)throw new AnalysisError("BUSY","当前正在处理其他请求，请稍后重试。",429);active++;let released=false;return ()=>{if(!released){released=true;active--;}};}
