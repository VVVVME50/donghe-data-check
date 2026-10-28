"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Download, FileText, Info, LoaderCircle, ScanLine, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ACTIVE_COUNTRIES, ACTIVE_BUSINESSES, ACTIVE_COUNTRY_CODES, TRANSFERS, LEVELS, DISCLAIMER, EXAMPLE_PROFILE, EXAMPLE_DESCRIPTION, makeDemoReport, activeProfileSchema, apiStatusSchema, apiErrorSchema, reportSchema, countryNames, businessName, reportDate, type Profile, type Report, type ApiStatus, type CountryCode } from "@/lib/assessment";
import { exportReportPDF } from "@/lib/report-pdf";
import { aiEndpoint, canCheckApi, apiCredentials } from "@/lib/ai-client";
import MaterialPicker from "./material-picker";
import JourneySteps from "./journey-steps";
import { materialContext, releaseMaterials, type Material, type MaterialContext } from "@/lib/materials";
type Stage="profile"|"materials"|"loading"|"report";
type MCPContext={registerTool:(tool:{name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
type Props={initialExample?:boolean;initialReport?:Report;initialProfile?:Profile;onSave?:(report:Report)=>void;onCases?:(c:CountryCode)=>void;onDocuments?:(c:CountryCode)=>void;onReport?:(report:Report)=>void;onToolbox?:(report:Report)=>void;onMaterials?:(id:string,context:MaterialContext)=>void;active?:boolean;enableMcp?:boolean;onDirtyChange?:(dirty:boolean)=>void};
export default function AssessmentWorkflow({initialExample=false,initialReport,initialProfile,onSave,onReport,onToolbox,onMaterials,active=true,enableMcp=true,onDirtyChange}:Props){
 const initial=initialReport?.profile||(initialExample?EXAMPLE_PROFILE:initialProfile);
 const [stage,setStage]=useState<Stage>(initialExample||initialReport?"report":"profile");
 const [countries,setCountries]=useState<string[]>(initial?.country_list||[]),[business,setBusiness]=useState(initial?.business_type||""),[transfer,setTransfer]=useState(initial?.data_transfer||"");
 const [description,setDescription]=useState("");const [items,setItems]=useState<Material[]>([]);const itemsRef=useRef(items);itemsRef.current=items;
 const [report,setReport]=useState<Report|null>(initialReport||(initialExample?makeDemoReport():null));
 const [api,setApi]=useState<ApiStatus|null>(null),[apiError,setApiError]=useState(""),[refresh,setRefresh]=useState(0);
 const [error,setError]=useState(""),[parsing,setParsing]=useState(false),[consent,setConsent]=useState(false),[exporting,setExporting]=useState(false),[pdf,setPdf]=useState<{url:string;filename:string}|null>(null);
 const pdfRef=useRef<string|null>(null),request=useRef<AbortController|null>(null),busy=useRef(false),generation=useRef(0);
 const profile=activeProfileSchema.safeParse({country_list:countries,business_type:business,data_transfer:transfer});
 const length=Array.from(description.trim()).length;const validMaterials=(length===0||length>=10)&&length<=2000&&(length>=10||items.length>0);
 const live=!!api?.configured;
 useEffect(()=>{if(active)window.scrollTo({top:0,behavior:"instant"});},[stage,active]);
 useEffect(()=>{if(report)onReport?.(report);},[report,onReport]);
 useEffect(()=>{if(!canCheckApi)return;const controller=new AbortController();setApiError("");fetch(aiEndpoint("/api/status"),{cache:"no-store",credentials:apiCredentials,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])}).then(async r=>{if(!r.ok)throw new Error();setApi(apiStatusSchema.parse(await r.json()));}).catch(()=>{if(!controller.signal.aborted)setApiError("AI 暂未连接，可先查看示例。");});return()=>controller.abort();},[refresh]);
 useEffect(()=>()=>{releaseMaterials(itemsRef.current);request.current?.abort();generation.current++;if(pdfRef.current)URL.revokeObjectURL(pdfRef.current);},[]);
 useEffect(()=>{onDirtyChange?.(countries.length>0||!!business||!!transfer||!!description||items.length>0||!!report);},[countries,business,transfer,description,items,report,onDirtyChange]);
 const current=useRef({stage,countries,business,transfer,report});current.current={stage,countries,business,transfer,report};
 useEffect(()=>{if(!enableMcp)return;const context=(document as unknown as {modelContext?:MCPContext}).modelContext;if(!context?.registerTool)return;const life=new AbortController();const tools=[{name:"get_assessment_state",title:"读取当前自查状态",description:"读取步骤和画像，不读取材料。",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...current.current,report:undefined,report_mode:current.current.report?.mode})},{name:"stage_assessment_profile",title:"填写业务画像",description:"只填写画像，不提交材料或调用 AI。",inputSchema:{type:"object",required:["country_list","business_type","data_transfer"],additionalProperties:false,properties:{country_list:{type:"array",items:{type:"string",enum:ACTIVE_COUNTRY_CODES},minItems:1,maxItems:4,uniqueItems:true},business_type:{type:"string",enum:ACTIVE_BUSINESSES.map(b=>b.value)},data_transfer:{type:"string",enum:TRANSFERS.map(t=>t.value)}}},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{const p=activeProfileSchema.parse(input);setCountries(p.country_list);setBusiness(p.business_type);setTransfer(p.data_transfer);setStage("profile");return p;}}];for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}}return()=>life.abort();},[enableMcp]);
 function move(next:Stage){setError("");setStage(next);}
 async function generate(){
  if(!profile.success||!validMaterials||busy.current||parsing||(live&&!consent))return;
  const id=++generation.current;busy.current=true;const controller=new AbortController();request.current=controller;move("loading");
  try{let result:Report;const context=await materialContext(description.trim(),items);
   if(live){const form=new FormData();form.set("profile",JSON.stringify(profile.data));form.set("description",context.description);form.set("documents",JSON.stringify(context.documents));items.filter(i=>i.kind==="image").forEach(i=>form.append("images",i.file));const res=await fetch(aiEndpoint("/api/analyze"),{method:"POST",body:form,credentials:apiCredentials,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(150000)])});const body=await res.json();if(!res.ok){const failure=apiErrorSchema.safeParse(body);throw new Error(failure.success?failure.data.error.message:"分析暂未完成，请重试。");}result=reportSchema.parse(body);if(result.mode!=="live")throw new Error("未收到真实分析结果。");}
   else {await new Promise(resolve=>setTimeout(resolve,900));result=makeDemoReport(profile.data);}
   if(id!==generation.current)return;
   if(result.mode==="live")onMaterials?.(result.report_id,context);
   setReport(result);setStage("report");
  }catch(e){if(id!==generation.current||controller.signal.aborted)return;setError(e instanceof Error?e.message:"分析失败，请重试。");setStage("materials");}finally{if(id===generation.current)busy.current=false;}
 }
 function cancel(){generation.current++;busy.current=false;request.current?.abort();move("materials");}
 async function download(){if(!report||exporting)return;setExporting(true);setError("");try{const file=await exportReportPDF(report);if(pdfRef.current)URL.revokeObjectURL(pdfRef.current);pdfRef.current=file.url;setPdf(file);}catch{setError("PDF 生成失败，请重试。");}finally{setExporting(false);}}
 const errorView=error&&<div className="inline-error" role="alert"><Info size={18}/>{error}</div>;
 if(stage==="report"&&report)return <main className="wrap v13-report">
  <JourneySteps step={2}/><div className="page-heading"><div><span className="page-overline">{report.mode==="demo"?"示例报告":"自查结果"}</span><h1>合规自查报告</h1><p>{countryNames(report.profile)} · {businessName(report.profile)} · {reportDate(report.created_at)}</p></div><button className="text-button" onClick={()=>onSave?.(report)}><FileText size={18}/>保存到本机</button></div>
  <div className="report-paper"><div className="report-paper-top"><div><ShieldCheck size={27}/><b>自查概览</b></div><span className={`risk-badge level-${report.risk_overview.overall_level}`}>{LEVELS[report.risk_overview.overall_level].label}</span></div>
  <p className="report-scope">{report.mode==="demo"?"预设示例，未分析你的材料。":report.analysis_scope==="reference_assisted"?"已关联法规资料；现行效力与适用仍待复核。":report.analysis_scope==="materials_only"?"仅依据材料初筛，法规依据待补充。":"AI 自查结果，需专业复核。"}</p>
  <div className="report-metrics">{(["high","medium","low","unknown"] as const).map(l=><div key={l}><strong>{report.risk_overview[`${l}_count`]}</strong><span>{LEVELS[l].label}</span></div>)}</div>
  <section className="preview-risks"><h2>重点关注</h2>{report.risk_list.slice(0,2).map((r,i)=><article key={r.id}><span className="preview-index">0{i+1}</span><div><h3>{r.title}</h3><p>{r.suggestion}</p></div></article>)}</section>
  <div className="preview-mask"><div className="masked-lines" aria-hidden="true"><i/><i/><i/></div><div><FileText size={24}/><b>完整事项与行动建议</b><span>下载 PDF 查看，或进入工具箱逐项解析。</span></div></div></div>
  {errorView}{pdf&&<p className="download-success" role="status"><Check size={18}/>PDF 已生成。<a href={pdf.url} download={pdf.filename}>再次下载</a></p>}
  <div className="report-exits"><button className="primary-button" onClick={download} disabled={exporting}>{exporting?<LoaderCircle size={20} className="spin"/>:<Download size={20}/>} {exporting?"正在生成 PDF":"下载完整 PDF"}</button><button className="secondary-button" onClick={()=>onToolbox?.(report)}>合规工具箱<ArrowRight size={20}/></button></div>
  <p className="short-disclaimer">{DISCLAIMER}</p><button className="text-button report-restart" onClick={()=>move("materials")}><ChevronLeft size={17}/>{initialReport?"重新自查":"补充材料"}</button>
 </main>;
 return <main className="wrap v13-assessment"><JourneySteps step={stage==="profile"?0:1}/>
 <div className="page-heading"><div><span className="page-overline">{stage==="profile"?"先了解你的业务":"基于实际业务开展自查"}</span><h1>{stage==="profile"?"建立业务画像":stage==="loading"?"正在生成报告":"提交业务材料"}</h1></div></div>
 <section className="v13-form">
 {stage==="profile"&&<><fieldset className="question"><legend>业务覆盖国家 <em>可多选</em></legend><div className="country-grid">{ACTIVE_COUNTRIES.map(c=><label className={`country-option ${countries.includes(c.code)?"selected":""}`} key={c.code}><span className="flag">{c.flag}</span><b>{c.name}</b><Checkbox checked={countries.includes(c.code)} aria-label={c.name} onCheckedChange={()=>setCountries(a=>a.includes(c.code)?a.filter(x=>x!==c.code):[...a,c.code])}/></label>)}</div></fieldset>
 <fieldset className="question"><legend>主要业务</legend><RadioGroup className="business-grid" value={business} onValueChange={setBusiness} aria-label="主要业务">{ACTIVE_BUSINESSES.map(b=><label className={`business-option ${business===b.value?"selected":""}`} key={b.value}><RadioGroupItem value={b.value}/><b>{b.label}</b></label>)}</RadioGroup></fieldset>
 <fieldset className="question"><legend>数据是否回传中国</legend><RadioGroup className="transfer-group" value={transfer} onValueChange={setTransfer} aria-label="数据回传情况">{TRANSFERS.map(t=><label className={`transfer-option ${transfer===t.value?"selected":""}`} key={t.value}><RadioGroupItem value={t.value}/><span>{({all:"全部回传",partial:"部分回传",local:"本地处理",unknown:"暂不确定"})[t.value]}</span></label>)}</RadioGroup></fieldset>
 <div className="form-next"><span>{!profile.success?"完成以上三项即可继续":"画像已就绪"}</span><button className="primary-button" disabled={!profile.success} onClick={()=>{if(profile.success){try{localStorage.setItem("donghe-profile-v13",JSON.stringify(profile.data));}catch{}move("materials");}}}>下一步：提交材料<ArrowRight size={19}/></button></div></>}
 {stage==="materials"&&<>{errorView}<div className="material-context"><span>{profile.success?countryNames(profile.data):""} · {profile.success?businessName(profile.data):""}</span><button className="text-button" onClick={()=>move("profile")}>修改画像</button></div>
 <div className="material-section"><div className="material-label"><label htmlFor="business-description">业务描述</label><button className="text-button" onClick={()=>setDescription(EXAMPLE_DESCRIPTION)}>填入示例</button></div><textarea id="business-description" rows={5} value={description} onChange={e=>{if(Array.from(e.target.value).length<=2000)setDescription(e.target.value);setError("");}} placeholder="说明收集什么数据、用于什么业务、保存在哪里，以及向谁共享。"/><div className="text-counter"><span>{length>0&&length<10?"至少填写 10 字":"文字或文件至少提供一种"}</span><span>{length} / 2000</span></div></div>
 <div className="material-section"><div className="material-label"><h3>相关材料</h3><span>{items.length} / 5</span></div><MaterialPicker items={items} onChange={setItems} onError={setError} onBusy={setParsing}/></div>
 <details className="upload-details"><summary>上传须知与数据使用</summary><p>单个文件不超过 5 MB，总计 10 MB。PDF 需含可复制文字，扫描页请上传图片；Word 支持 DOCX。文档仅读取正文，内嵌图片请另传。请先遮盖个人信息。</p><p>真实分析会将材料及命中的法规片段发送至千问。本次原始材料仅留在当前会话，刷新后清除；输出可手动保存到本机。</p></details>
 {live?<label className="ai-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>同意将本次材料及命中片段发送至千问分析</span></label>:<div className="mode-notice" role="status">{apiError||"当前为示例模式，提交后展示预设报告。"}{apiError&&<button className="text-button" onClick={()=>setRefresh(x=>x+1)}>重连</button>}</div>}
 <div className="form-next"><button className="text-button" onClick={()=>move("profile")}><ChevronLeft size={18}/>上一步</button><button className="primary-button" disabled={!profile.success||!validMaterials||parsing||(live&&!consent)} onClick={generate}><ScanLine size={20}/>{live?"开始 AI 合规检测":"生成示例报告"}</button></div></>}
 {stage==="loading"&&<div className="simple-loading" role="status"><LoaderCircle size={48} className="spin"/><h2>{live?"正在核对材料与依据":"正在准备示例"}</h2><p>完成后自动进入报告预览。</p><button className="text-button" onClick={cancel}>取消并返回</button></div>}
 </section></main>;
}
