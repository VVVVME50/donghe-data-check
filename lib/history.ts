import { z } from "zod";
import { COUNTRY_CODES, reportSchema, type Report } from "./assessment";
import { draftSchema, type Draft } from "./documents";
export const comparisonSchema=z.object({id:z.string(),created_at:z.string().datetime(),countries:z.array(z.enum(COUNTRY_CODES)).min(2).max(10),dimension:z.enum(["all","collection","transfer","storage"]),snapshot:z.string().max(100000).optional()}).strict();
export type Comparison=z.infer<typeof comparisonSchema>;
const entrySchema=z.discriminatedUnion("kind",[z.object({kind:z.literal("assessment"),value:reportSchema}),z.object({kind:z.literal("document"),value:draftSchema}),z.object({kind:z.literal("comparison"),value:comparisonSchema})]);
export type HistoryEntry={kind:"assessment";value:Report}|{kind:"document";value:Draft}|{kind:"comparison";value:Comparison};
const KEY="donghe-v2-output-history";
export function historyId(e:HistoryEntry){return e.kind==="assessment"?e.value.report_id:e.value.id;}
export function readHistory():HistoryEntry[]{try{const raw=localStorage.getItem(KEY);if(!raw||raw.length>1500000)return [];return z.array(entrySchema).max(20).parse(JSON.parse(raw)) as HistoryEntry[];}catch{return [];}}
export function saveHistory(e:HistoryEntry){entrySchema.parse(e);const entries=[e,...readHistory().filter(x=>historyId(x)!==historyId(e))].slice(0,20);const json=JSON.stringify(entries);if(json.length>1500000)throw new Error("本机记录已满，请删除部分记录后重试。");localStorage.setItem(KEY,json);return entries;}
export function deleteHistory(id:string){const entries=readHistory().filter(e=>historyId(e)!==id);localStorage.setItem(KEY,JSON.stringify(entries));return entries;}
export function clearHistory(){localStorage.removeItem(KEY);}
