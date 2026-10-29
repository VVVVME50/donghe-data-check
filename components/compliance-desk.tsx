"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Download, FileSearch, FileText, LoaderCircle, Network, Send, ShieldCheck } from "lucide-react";
import { ACTIVE_COUNTRIES, DISCLAIMER, LEVELS, countryNames, type Report, type Source } from "@/lib/assessment";
import { apiErrorSchema, apiStatusSchema } from "@/lib/assessment";
import { aiEndpoint, apiCredentials, canCheckApi } from "@/lib/ai-client";
import { deskResponseSchema } from "@/lib/desk-contract";
import { DOCUMENT_TYPES, draftSchema, draftText, makeTemplate, type Draft, type DocumentInput } from "@/lib/documents";
import { materialContext, releaseMaterials, type Material, type MaterialContext } from "@/lib/materials";
import type { HistoryEntry } from "@/lib/history";
import type { RagReference } from "@/lib/rag-contract";
import MaterialPicker from "./material-picker";
import JourneySteps from "./journey-steps";
export type ComplianceDeskTab="analysis"|"documents"|"resources";
export type ComplianceDeskProps={report?:Report|null;entries:HistoryEntry[];onStart:()=>void;onSave:(entry:HistoryEntry)=>void;onOpenLibrary:()=>void;onBackReport?:(report:Report)=>void;contexts?:Record<string,MaterialContext>;initialTab?:ComplianceDeskTab;requestId?:number;active?:boolean};
const MODES=[{id:"analysis" as const,title:"报告解析",icon:FileSearch},{id:"documents" as const,title:"文档生成",icon:FileText},{id:"resources" as const,title:"资源对接",icon:Network}];
type Message={id:string;role:"user"|"assistant";label?:string;text:string;references?:Source[]|RagReference[];draft?:Draft};
function message(role:Message["role"],text:string,rest:Partial<Message>={}):Message{return {id:crypto.randomUUID(),role,text,...rest};}
function reportText(report:Report){return JSON.stringify({mode:report.mode,profile:report.profile,risks:report.risk_list.map(r=>({title:r.title,description:r.description,evidence:r.evidence,suggestion:r.suggestion,level:r.level})),information_gaps:report.information_gaps,disposal_guide:report.disposal_guide}).slice(0,20000);}
function ReferenceList({sources}:{sources:Source[]|RagReference[]}){return <details className="message-sources"><summary><BookOpen size={17}/>依据与原文（{sources.length}）<ChevronDown size={16}/></summary>{sources.map(source=><div className="message-source" key={source.id}><b>{source.name} · {source.article}</b><blockquote>{source.cited_quote||source.excerpt}</blockquote><span>{source.source_file}{source.pages?` · ${source.pages}`:""} · {source.version||"版本未标明"}</span><p>{source.review_status==="reviewed_current"?"现行版本已复核；适用仍需核查。":"来源资料，现行效力与适用待复核。"}</p></div>)}</details>;}
export default function ComplianceDesk({report=null,entries,onStart,onSave,onOpenLibrary,onBackReport,contexts={},initialTab="analysis",requestId=0,active=true}:ComplianceDeskProps){
 const [mode,setMode]=useState({tab:initialTab,initialTab,requestId});const tab=mode.initialTab===initialTab&&mode.requestId===requestId?mode.tab:initialTab;
 const current=report?.report_id||"";const [choice,setChoice]=useState({current,selected:current});const selected=choice.current===current?choice.selected:current;
 const reports:Report[]=[];for(const item of [report,...entries.filter(e=>e.kind==="assessment").map(e=>e.value as Report)])if(item&&!reports.some(r=>r.report_id===item.report_id))reports.push(item);
 const activeReport=reports.find(r=>r.report_id===selected)||reports[0];
 const [configured,setConfigured]=useState(false);
 useEffect(()=>{if(!canCheckApi)return;const controller=new AbortController();fetch(aiEndpoint("/api/status"),{credentials:apiCredentials,cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(r=>r.json()).then(body=>setConfigured(apiStatusSchema.parse(body).configured)).catch(()=>{});return()=>controller.abort();},[]);
 return <main className="wrap v13-desk"><JourneySteps step={3}/><div className="page-heading"><div><h1>合规工具箱</h1></div>{activeReport&&<button className="text-button" onClick={()=>onBackReport?.(activeReport)}><ArrowLeft size={18}/>返回报告</button>}</div>
 <div className="desk-layout"><aside className="desk-sidebar"><label className="mobile-mode">当前功能<select value={tab} onChange={e=>setMode({tab:e.target.value as ComplianceDeskTab,initialTab,requestId})}>{MODES.map(m=><option key={m.id} value={m.id}>{m.title}{m.id==="resources"?" · 三期规划":""}</option>)}</select></label><nav aria-label="工具箱功能">{MODES.map(({id,title,icon:Icon})=><button className={tab===id?"selected":""} key={id} aria-current={tab===id?"page":undefined} onClick={()=>setMode({tab:id,initialTab,requestId})}><Icon size={21}/><span>{title}</span>{id==="resources"&&<small>三期</small>}</button>)}</nav><div className="desk-sidebar-bottom"><ShieldCheck size={20}/><span>内部法规库</span><button className="text-button" onClick={onOpenLibrary}>查阅资料<ArrowRight size={16}/></button></div></aside>
 <div className="desk-main">{activeReport?<><div className="desk-context"><span><FileText size={18}/>{countryNames(activeReport.profile)}{activeReport.mode==="demo"?" · 示例报告":" · 当前报告"}</span>{reports.length>1&&<select aria-label="切换报告" value={activeReport.report_id} onChange={e=>setChoice({current,selected:e.target.value})}>{reports.map(r=><option key={r.report_id} value={r.report_id}>{countryNames(r.profile)} · {r.report_id}</option>)}</select>}<details><summary>已关联本次上下文</summary><p>{contexts[activeReport.report_id]?`业务描述、${contexts[activeReport.report_id].documents.length+contexts[activeReport.report_id].images.length} 个文件及当前报告。`:"画像与报告已沿用；历史报告不保留原始材料，可在下方补充。"}</p></details></div>
 {reports.map(r=><div key={r.report_id} hidden={r.report_id!==activeReport.report_id}><DeskConversation report={r} context={contexts[r.report_id]} tab={tab} configured={configured} onSave={onSave} active={active&&r.report_id===activeReport.report_id}/></div>)}</>:<div className="desk-empty"><FileSearch size={42}/><h2>先完成一次自查</h2><p>工具箱将沿用你的画像、材料和报告。</p><button className="primary-button" onClick={onStart}>开始自查<ArrowRight size={20}/></button></div>}</div></div></main>;
}
function DeskConversation({report,context,tab,configured,onSave,active}:{report:Report;context?:MaterialContext;tab:ComplianceDeskTab;configured:boolean;onSave:(entry:HistoryEntry)=>void;active:boolean}){
 const [messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(""),[items,setItems]=useState<Material[]>([]),[error,setError]=useState(""),[parsing,setParsing]=useState(false),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const [docType,setDocType]=useState<DocumentInput["type"]>("shop"),[country,setCountry]=useState(report.profile.country_list[0]),[dataTypes,setDataTypes]=useState(""),[storage,setStorage]=useState(""),[useAi,setUseAi]=useState(false);
 const locked=useRef(false),controller=useRef<AbortController|null>(null),itemsRef=useRef(items),scroll=useRef<HTMLDivElement|null>(null);itemsRef.current=items;
 const live=configured&&report.mode==="live";
 useEffect(()=>()=>{controller.current?.abort();releaseMaterials(itemsRef.current);},[]);
 useEffect(()=>{if(active&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[messages,busy,active]);
 function readReport(kind:"overview"|"sources"|"actions"){
  const titles={overview:"优先处理哪些问题？",sources:"查看报告引用依据",actions:"下一步该做什么？"};let response="";let references:Source[]=[];
  if(kind==="overview")response=report.risk_list.map((r,i)=>`${i+1}. ${r.title}\n${LEVELS[r.level].label} · ${r.suggestion}`).join("\n\n");
  if(kind==="actions")response=report.disposal_guide+(report.information_gaps.length?"\n\n需要补充：\n"+report.information_gaps.map(g=>`• ${g}`).join("\n"):"");
  if(kind==="sources"){for(const risk of report.risk_list)for(const source of risk.sources)if(!references.some(s=>s.id===source.id))references.push(source);response=references.length?"这是本份报告实际引用的资料。展开下方核对原文、文件名及版本；引用不代表已确认适用。":"这份报告没有可验证的法规引用，不能据此判断法律适用或处罚。";}
  setMessages(current=>[...current,message("user",titles[kind]),message("assistant",response,{label:report.mode==="demo"?"示例报告摘录":"报告摘录 · 未新调用 AI",references})]);
 }
 async function send(){
  if(locked.current||parsing)return;if(tab==="resources"){setError("专业服务名录尚未配置，当前不提供机构推荐。");return;}
  if(tab==="analysis"&&!text.trim()){setError("请输入具体问题，或选择上方快捷问题。");return;}
  const needsAi=tab==="analysis"||useAi;if(needsAi&&(!live||!consent)){setError(!live?"当前仅可体验报告摘录与模板。真实报告生成后可使用 AI 追问。":"请先同意将当前上下文发送至千问。");return;}
  const question=text.trim();locked.current=true;setBusy(true);setError("");const abort=new AbortController();controller.current=abort;
  try{
   const extra=await materialContext("",items);const documents=[...(context?.documents||[]),...extra.documents];const images=[...(context?.images||[]),...extra.images];
   if(needsAi&&(documents.length>5||images.length>10||documents.reduce((n,d)=>n+d.text.length,0)>60000||images.reduce((n,i)=>n+i.data.length,0)>14000000))throw new Error("沿用材料与补充文件合计超过限制，请移除部分补充材料后重试。");
   const userMessage=tab==="documents"?`生成${DOCUMENT_TYPES.find(d=>d.id===docType)?.label}${question?`：${question}`:""}`:question;
   setMessages(current=>[...current,message("user",userMessage)]);
   if(tab==="documents"){
    const input:DocumentInput={country,type:docType,data_types:dataTypes,storage};let draft:Draft;
    if(useAi){const res=await fetch(aiEndpoint("/api/documents"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:apiCredentials,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(150000)]),body:JSON.stringify({...input,context:{question,profile:report.profile,report:reportText(report),description:context?.description||"",documents,images:images.map(i=>({mime:i.mime,base64:i.data}))}})});const body=await res.json();if(!res.ok){const fail=apiErrorSchema.safeParse(body);throw new Error(fail.success?fail.data.error.message:"生成失败，请重试。");}draft=draftSchema.parse(body);}
    else draft=makeTemplate(input);
    setMessages(current=>[...current,message("assistant",`${draft.title}\n\n${draft.mode==="template"?"模板底稿已准备，补齐占位符后请专业复核。":"初稿已生成，使用前请专业复核。"}`,{label:draft.mode==="template"?"模板生成 · 未调用 AI":"AI 文档初稿",draft})]);
   }else{
    const res=await fetch(aiEndpoint("/api/desk"),{method:"POST",headers:{"Content-Type":"application/json"},credentials:apiCredentials,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(150000)]),body:JSON.stringify({profile:report.profile,question,history:messages.slice(-8).map(m=>({role:m.role,text:m.text.slice(0,5000)})),report_context:reportText(report),description:context?.description||"",documents,images:images.map(i=>({mime:i.mime,base64:i.data}))})});const body=await res.json();if(!res.ok){const fail=apiErrorSchema.safeParse(body);throw new Error(fail.success?fail.data.error.message:"回答暂未完成，请重试。");}const response=deskResponseSchema.parse(body);setMessages(current=>[...current,message("assistant",response.answer,{label:"AI 回答 · 已校验引用",references:response.references})]);
   }
   setText("");
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:"请求失败，请重试。");}finally{locked.current=false;setBusy(false);}
 }
 function downloadDraft(draft:Draft){const url=URL.createObjectURL(new Blob([draftText(draft)],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`${draft.title}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 return <div className="desk-conversation">
 <div className="desk-mode-content">
 {tab==="analysis"&&<div className="desk-quick"><button disabled={busy} onClick={()=>readReport("overview")}>优先处理什么</button><button disabled={busy} onClick={()=>readReport("sources")}>核对引用依据</button><button disabled={busy} onClick={()=>readReport("actions")}>下一步行动</button></div>}
 {tab==="documents"&&<div className="desk-document-options"><div className="document-option-row"><label>文档类型<select value={docType} onChange={e=>setDocType(e.target.value as DocumentInput["type"])} disabled={busy}>{DOCUMENT_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><label>适用国家<select value={country} onChange={e=>setCountry(e.target.value as typeof country)} disabled={busy}>{ACTIVE_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label></div><details><summary>补充文档信息</summary><div className="document-option-row"><label>数据类别<input maxLength={300} placeholder="如：订单、联系方式" value={dataTypes} onChange={e=>setDataTypes(e.target.value)}/></label><label>存储位置<input maxLength={300} placeholder="填写实际位置或留空待补充" value={storage} onChange={e=>setStorage(e.target.value)}/></label></div></details><label className="ai-consent"><input type="checkbox" checked={useAi} disabled={!live||busy} onChange={e=>setUseAi(e.target.checked)}/><span>使用 AI 整理初稿{!live?"（真实报告后启用）":""}</span></label></div>}
 {tab==="resources"&&<div className="resources-planned"><Network size={27}/><div><h2>资源对接 · 三期规划</h2><p>服务名录尚未配置。可先用报告整理咨询问题。</p></div></div>}
 </div>
 <div className="chat-thread" ref={scroll} aria-label="共享对话记录" aria-live="polite">
 {!messages.length&&<div className="chat-welcome"><span className="chat-symbol"><ShieldCheck size={30}/></span><h2>{tab==="documents"?"准备一份合规文档":tab==="resources"?"让后续咨询更有准备":"从这份报告继续"}</h2><p>{tab==="documents"?"选择文档类型，补充业务信息后生成初稿。":tab==="resources"?"报告解析与文档生成记录会保留在这里。":"先读重点、核对依据，再明确下一步。"}</p><span>三个功能共用本次对话</span></div>}
 {messages.map(m=><article key={m.id} className={`chat-message ${m.role}`}><span className="message-label">{m.role==="user"?"你":m.label||"东合智检"}</span><div className="message-bubble"><p>{m.text}</p>{m.references?.length? <ReferenceList sources={m.references}/>:null}{m.draft&&<><details className="draft-preview"><summary>查看文档初稿<ChevronDown size={17}/></summary>{m.draft.sections.map(s=><section key={s.heading}><h3>{s.heading}</h3><p>{s.body}</p></section>)}</details><div className="message-actions"><button onClick={()=>downloadDraft(m.draft!)}><Download size={17}/>下载初稿</button><button onClick={()=>onSave({kind:"document",value:m.draft!})}>保存到本机</button></div></>}{m.role==="assistant"&&<small className="message-disclaimer">{DISCLAIMER}</small>}</div></article>)}
 {busy&&<div className="chat-pending" role="status"><LoaderCircle size={19} className="spin"/>正在整理并核对依据…<button className="text-button" onClick={()=>{controller.current?.abort();setError("已取消，问题与补充文件仍保留。");}}>取消</button></div>}
 </div>
 {tab!=="resources"&&<form className="chat-composer" onSubmit={e=>{e.preventDefault();void send();}}>
 {error&&<p className="composer-error" role="alert">{error}</p>}
 <textarea value={text} onChange={e=>setText(e.target.value)} maxLength={1000} rows={2} aria-label="对话内容" disabled={busy} placeholder={tab==="documents"?"可补充文档用途与特殊要求…":"输入具体问题，继续解析这份报告…"}/>
 <div className="composer-tools"><MaterialPicker items={items} compact onChange={setItems} onError={setError} onBusy={setParsing} disabled={busy}/><button type="submit" className="primary-button" disabled={busy||parsing||(tab==="analysis"&&(!text.trim()||!live||!consent))||(tab==="documents"&&useAi&&!consent)}>{busy?<LoaderCircle size={19} className="spin"/>:<Send size={19}/>}<span>{tab==="documents"?"生成初稿":"发送"}</span></button></div>
 {(tab==="analysis"||useAi)&&<label className="ai-consent"><input type="checkbox" checked={consent} disabled={busy||!live} onChange={e=>setConsent(e.target.checked)}/><span>{live?"同意将当前对话、报告、材料及命中片段发送至千问":"示例模式：可阅读报告与生成模板，暂不调用 AI"}</span></label>}
 {!useAi&&tab==="documents"&&<p className="composer-note">模板仅使用上方字段；AI 模式会结合报告、正文与扫描页图片。</p>}
 </form>}
 </div>;
}
