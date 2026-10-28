import { z } from "zod";
import { activeProfileSchema } from "./assessment";
import { ragReferenceSchema } from "./rag-contract";
export const deskInputSchema=z.object({
 profile:activeProfileSchema,
 question:z.string().trim().min(1).max(1000),
 history:z.array(z.object({role:z.enum(["user","assistant"]),text:z.string().max(5000)}).strict()).max(8),
 report_context:z.string().max(20000),
 description:z.string().max(2000),
 documents:z.array(z.object({name:z.string().max(255),text:z.string().min(10).max(30000)}).strict()).max(5).refine(d=>d.reduce((n,x)=>n+x.text.length,0)<=60000),
 images:z.array(z.object({mime:z.enum(["image/jpeg","image/png"]),base64:z.string().min(8).max(7000000)}).strict()).max(5),
}).strict().refine(v=>v.images.reduce((n,x)=>n+x.base64.length,0)<=14000000);
export type DeskInput=z.infer<typeof deskInputSchema>;
export const deskResponseSchema=z.object({answer:z.string().min(1).max(2200),references:z.array(ragReferenceSchema).max(8),disclaimer:z.string()});
