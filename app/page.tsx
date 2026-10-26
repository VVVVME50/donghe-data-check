"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, FileCheck2, FileText, FolderOpen, Globe2, ScanLine, ShieldCheck, X } from "lucide-react";
import AssessmentWorkflow from "@/components/assessment-workflow";
import { AccessibleModal, CasesTool, CompareTool, DocumentsTool, HistoryTool, LawsTool } from "@/components/toolbox";
import { canCheckApi, internalWorkspaceUrl, isInternalWorkspace } from "@/lib/ai-client";
import RegulationLibrary from "@/components/regulation-library";
import { COUNTRIES, DISCLAIMER, type CountryCode, type Profile } from "@/lib/assessment";
import { clearHistory, deleteHistory, readHistory, saveHistory, type HistoryEntry } from "@/lib/history";
type View="home"|"example"|"assessment"|"documents"|"cases"|"laws"|"compare"|"history";
const WORK_TABS:[View,string][]=[["assessment","风险自查"],["documents","文档准备"]];
const REFERENCE_TABS:[View,string][]=[["laws",canCheckApi?"法规库":"法规参考"],["cases","处罚案例"],["compare","多国比对"]];
export default function Home(){
 const [view,setView]=useState<View>("home"),[lastWork,setLastWork]=useState<View>("assessment"),[lastReference,setLastReference]=useState<View>("laws");
 const [assessmentStarted,setAssessmentStarted]=useState(false),[assessmentKey,setAssessmentKey]=useState(0),[profile,setProfile]=useState<Profile|undefined>(),[relatedCountry,setRelatedCountry]=useState<CountryCode|undefined>();
 const [entries,setEntries]=useState<HistoryEntry[]>([]),[message,setMessage]=useState(""),[documentsStarted,setDocumentsStarted]=useState(false),[compareStarted,setCompareStarted]=useState(false),[lawsStarted,setLawsStarted]=useState(false),[assessmentDirty,setAssessmentDirty]=useState(false),[pendingProfile,setPendingProfile]=useState<Profile|null>(null),[documentRequest,setDocumentRequest]=useState(0);
 useEffect(()=>{setEntries(readHistory());},[]);
 const isWork=["assessment","documents","example"].includes(view),isReference=["laws","cases","compare"].includes(view);
 function go(next:View){setView(next);setMessage("");if(next==="assessment")setAssessmentStarted(true);if(next==="documents")setDocumentsStarted(true);if(next==="compare")setCompareStarted(true);if(next==="laws")setLawsStarted(true);if(WORK_TABS.some(([id])=>id===next))setLastWork(next);if(REFERENCE_TABS.some(([id])=>id===next))setLastReference(next);requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"instant"}));}
 function start(next:Profile){if(assessmentDirty){setPendingProfile(next);return;}replaceAssessment(next);}
 function replaceAssessment(next:Profile){setProfile(next);setAssessmentKey(k=>k+1);setAssessmentStarted(true);go("assessment");}
 function save(entry:HistoryEntry){try{setEntries(saveHistory(entry));setMessage("已保存到我的记录，仅保留在本浏览器。");}catch(error){setMessage(error instanceof Error?error.message:"保存失败，请检查浏览器存储权限。");}}
 const reportActions={onSave:(r:import("@/lib/assessment").Report)=>save({kind:"assessment",value:r}),onCases:(c:CountryCode)=>{setRelatedCountry(c);go("cases");},onDocuments:(c:CountryCode)=>{setRelatedCountry(c);setDocumentRequest(n=>n+1);go("documents");}};
 return <div className="site-shell organized-shell">
  <header className="site-header"><div className="header-inner">
   <button className="brand" onClick={()=>go("home")} aria-label="东合智检首页"><span className="brand-symbol"><ShieldCheck size={27}/></span><span>东合智检</span></button>
   <nav className="primary-nav" aria-label="主导航">
    <button className={isWork?"active":""} aria-current={isWork?"page":undefined} onClick={()=>go(lastWork)}><ScanLine size={20}/>工作台</button>
    <button className={isReference?"active":""} aria-current={isReference?"page":undefined} onClick={()=>go(lastReference)}><Globe2 size={20}/>参考资料</button>
    <button className={view==="history"?"active":""} aria-current={view==="history"?"page":undefined} onClick={()=>go("history")}><FolderOpen size={20}/>我的记录</button>
   </nav><span className="header-purpose">{isInternalWorkspace?"内部法规工作台":"出海数据合规"}</span>
  </div></header>
  {!canCheckApi&&internalWorkspaceUrl&&<div className="public-experience"><div className="wrap"><p><b>公开体验</b><span>法规库检索与真实 AI 分析仅限内部授权账号使用。</span></p><a href={internalWorkspaceUrl} target="_blank" rel="noopener noreferrer">进入内部工作台<ArrowUpRight size={18}/></a></div></div>}
  {(isWork||isReference)&&<div className="context-bar"><nav className="wrap context-tabs" aria-label={isWork?"工作台功能":"参考资料功能"}><span>{isWork?"工作台":"参考资料"}</span>{(isWork?WORK_TABS:REFERENCE_TABS).map(([id,label])=><button key={id} className={view===id||(view==="example"&&id==="assessment")?"active":""} aria-current={view===id?"page":undefined} onClick={()=>go(id)}>{label}</button>)}</nav></div>}
  {view==="home"&&<main>
   <section className="hero-band"><div className="hero wrap"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/>面向出海东盟企业</div><h1>先理清业务，<br/>再看清<span>数据风险。</span></h1><p>从你的业务材料出发，结合提供的法规资料，<br className="desktop-break"/>把问题、依据和下一步放在一起。</p><div className="hero-actions"><button className="primary-button" onClick={()=>go("assessment")}>开始风险自查<ArrowRight size={22}/></button><button className="hero-secondary" onClick={()=>go("laws")}>查阅法规资料<ArrowUpRight size={20}/></button></div><div className="hero-meta"><span><Check size={18}/>按国家检索</span><span><Check size={18}/>引用可追溯</span><span><Check size={18}/>资料不足时明确提示</span></div></div>
   <div className="hero-dashboard"><div className="dashboard-heading"><span className="dashboard-icon"><FileCheck2 size={24}/></span><div><b>一份清楚的自查结果</b><p>业务材料 → 法规检索 → 依据核对</p></div></div><div className="dashboard-body"><div className="dashboard-title"><div className="eyebrow">从问题到依据，连贯地看</div><h2>知道为什么，<br/>才知道下一步。</h2></div>{[["01","先整理业务事实","收集什么、流向哪里、谁能访问"],["02","再查阅相关原文","保留法律名称、条号和资料版本"],["03","最后核对适用条件","没有充分依据的事项保留待核实"]].map(([n,title,body])=><div className="dashboard-row" key={n}><span>{n}</span><div><b>{title}</b><p>{body}</p></div><ChevronRight size={21}/></div>)}<button className="dashboard-link" onClick={()=>go("example")}>查看报告形式示例<ArrowRight size={20}/></button></div><div className="dashboard-foot">来源文本与现行法规核验分开标识，结果需专业复核。</div></div></div></section>
   <section className="entry-section wrap"><div className="entry-intro"><div className="eyebrow">按你现在要做的事进入</div><h2>处理业务，或查阅依据。</h2></div><div className="entry-grid"><article className="entry-card surface"><span className="entry-icon"><ScanLine size={28}/></span><div><h3>工作台</h3><p>完成风险自查，再准备面向用户的告知文档。</p><div className="entry-links"><button className="text-button" onClick={()=>go("assessment")}>风险自查<ArrowRight size={18}/></button><button className="text-button" onClick={()=>go("documents")}>文档准备<ArrowRight size={18}/></button></div></div></article><article className="entry-card surface"><span className="entry-icon"><Globe2 size={28}/></span><div><h3>参考资料</h3><p>法规原文、监管案例和市场对比，集中在一个地方。</p><button className="text-button" onClick={()=>go("laws")}>进入资料库<ArrowRight size={18}/></button></div></article></div></section>
   <section className="coverage-strip wrap"><span>支持选择的市场</span><div>{COUNTRIES.map(c=><span key={c.code}>{c.flag} {c.name}</span>)}</div><p>各地知识资料覆盖与核验状态，以法规库中的实际显示为准。</p></section>
  </main>}
  {assessmentStarted&&<div hidden={view!=="assessment"}><AssessmentWorkflow key={assessmentKey} initialProfile={profile} active={view==="assessment"} onDirtyChange={setAssessmentDirty} {...reportActions}/></div>}
  {documentsStarted&&<div hidden={view!=="documents"}><DocumentsTool initialCountry={relatedCountry} countryRequestId={documentRequest} onSave={save}/></div>}
  {lawsStarted&&<div hidden={view!=="laws"}>{canCheckApi?<RegulationLibrary active={view==="laws"}/>:<LawsTool/>}</div>}
  {view==="cases"&&<CasesTool key={relatedCountry||"all"} initialCountry={relatedCountry} onAssess={c=>start({country_list:[c],business_type:"ecommerce",data_transfer:"unknown"})}/>}
  {compareStarted&&<div hidden={view!=="compare"}><CompareTool onSave={save}/></div>}
  {view==="history"&&<HistoryTool entries={entries} onDelete={id=>setEntries(deleteHistory(id))} onClear={()=>{clearHistory();setEntries([]);}} onResume={start}/>}
  {view==="example"&&<AssessmentWorkflow initialExample enableMcp={false} {...reportActions}/>}
  {pendingProfile&&<AccessibleModal label="开始新的自查" onClose={()=>setPendingProfile(null)}><h2>开始新的自查</h2><p>这会替换当前填写内容；已保存的输出结果会保留。</p><div className="action-row"><button className="secondary-button" onClick={()=>setPendingProfile(null)}>保留当前自查</button><button className="primary-button" onClick={()=>{const next=pendingProfile;setPendingProfile(null);replaceAssessment(next);}}>使用新画像继续</button></div></AccessibleModal>}
  {message&&<div className="save-toast" role="status"><Check size={21}/><span>{message}</span><button aria-label="关闭提示" onClick={()=>setMessage("")}><X size={20}/></button></div>}
  <section className="boundary wrap"><ShieldCheck size={25}/><div><b>辅助业务自查，保留专业判断。</b><details><summary>查看使用边界</summary><p>{DISCLAIMER} 来源文本不等于现行规则；检索和引用校验用于减少无依据输出，不能保证消除所有错误。</p></details></div></section>
  <footer className="site-footer wrap"><div><b>东合智检</b><span>让业务、依据和行动更清楚</span></div><span>企业数据合规自查</span></footer>
 </div>;
}
