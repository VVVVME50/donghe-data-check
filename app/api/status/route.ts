import { status } from "@/lib/ai-server";
export function GET(){return Response.json(status(),{headers:{"Cache-Control":"no-store"}});}
