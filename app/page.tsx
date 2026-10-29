"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, FolderOpen, Globe2, ShieldCheck, X, ChevronDown } from "lucide-react";
import AccountPanel from "@/components/account-panel";
import AssessmentWorkflow from "@/components/assessment-workflow";
import ComplianceDesk from "@/components/compliance-desk";
import { AccessibleModal, CasesTool, CompareTool, HistoryTool, LawsTool } from "@/components/toolbox";
import { canCheckApi, internalWorkspaceUrl, isInternalWorkspace } from "@/lib/ai-client";
import RegulationLibrary from "@/components/regulation-library";
import { DISCLAIMER, type CountryCode, type Profile, type Report } from "@/lib/assessment";
import { clearHistory, deleteHistory, readHistory, saveHistory, type HistoryEntry } from "@/lib/history";
import type { MaterialContext } from "@/lib/materials";
import { activeProfileSchema } from "@/lib/assessment";
type View="account"|"report"|"home"|"example"|"assessment"|"toolbox"|"cases"|"laws"|"compare"|"history";
type DeskTab="analysis"|"documents"|"resources";
const REFERENCE_TABS:[View,string][]=[["laws",canCheckApi?"内部法规库":"法规参考"],["cases","监管案例"],["compare","多国比对"]];
const JOURNEY=[{n:"1",title:"填写画像",text:"选择国家、业务和数据流向"},{n:"2",title:"提交材料",text:"文字、截图或业务文件"},{n:"3",title:"查看报告",text:"核对依据，下载完整 PDF"},{n:"4",title:"继续处理",text:"报告解析与文档生成"}];
export default function Home(){
 const menuRef=useRef<HTMLDetailsElement|null>(null);
 const [view,setView]=useState<View>("home"),[lastReference,setLastReference]=useState<View>("laws");
 const [assessmentStarted,setAssessmentStarted]=useState(false),[assessmentKey,setAssessmentKey]=useState(0),[profile,setProfile]=useState<Profile|undefined>(),[relatedCountry,setRelatedCountry]=useState<CountryCode|undefined>();
 const [entries,setEntries]=useState<HistoryEntry[]>([]),[message,setMessage]=useState(""),[compareStarted,setCompareStarted]=useState(false),[lawsStarted,setLawsStarted]=useState(false),[assessmentDirty,setAssessmentDirty]=useState(false),[pendingProfile,setPendingProfile]=useState<Profile|null>(null);
 const [latestReport,setLatestReport]=useState<Report|null>(null),[deskStarted,setDeskStarted]=useState(false),[deskTab,setDeskTab]=useState<DeskTab>("analysis"),[deskRequest,setDeskRequest]=useState(0);
 useEffect(()=>{setEntries(readHistory());try{const p=activeProfileSchema.safeParse(JSON.parse(localStorage.getItem("donghe-profile-v13")||"null"));if(p.success)setProfile(p.data);}catch{}},[]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(""),3000);return()=>clearTimeout(timer);},[message]);
 const [contexts,setContexts]=useState<Record<string,MaterialContext>>({});
 const isReference=["laws","cases","compare"].includes(view),isAssessment=["assessment","example","report"].includes(view);
 function go(next:View){if(menuRef.current)menuRef.current.open=false;setView(next);setMessage("");if(next==="assessment")setAssessmentStarted(true);if(next==="toolbox")setDeskStarted(true);if(next==="compare")setCompareStarted(true);if(next==="laws")setLawsStarted(true);if(REFERENCE_TABS.some(([id])=>id===next))setLastReference(next);requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"instant"}));}
 function openDesk(tab:DeskTab="analysis",report?:Report){if(report)setLatestReport(report);setDeskTab(tab);setDeskRequest(n=>n+1);go("toolbox");}
 function start(next:Profile){if(assessmentDirty){setPendingProfile(next);return;}replaceAssessment(next);}
 function replaceAssessment(next:Profile){setProfile(next);setAssessmentKey(k=>k+1);setAssessmentStarted(true);go("assessment");}
 function backToReport(report:Report){setLatestReport(report);go("report");}
 function save(entry:HistoryEntry){try{setEntries(saveHistory(entry));setMessage("已保存到我的报告，仅保留在本浏览器。");}catch(error){setMessage(error instanceof Error?error.message:"保存失败，请检查浏览器存储权限。");}}
 const reportActions={onMaterials:(id:string,context:MaterialContext)=>setContexts(current=>({...current,[id]:context})),onReport:setLatestReport,onSave:(r:Report)=>save({kind:"assessment",value:r}),onCases:(c:CountryCode)=>{setRelatedCountry(c);go("cases");},onDocuments:()=>openDesk("documents"),onToolbox:(r:Report)=>openDesk("analysis",r)};
 return <div className="site-shell journey-shell clarity-shell">
  <header className="site-header"><div className="header-inner">
   <button className="brand" onClick={()=>go("home")} aria-label="东合智检首页"><span className="brand-symbol"><ShieldCheck size={28}/></span><span className="brand-wordmark">东合智检</span></button>
   <nav className="journey-nav" aria-label="主导航"><button className={view==="home"?"active":""} aria-current={view==="home"?"page":undefined} onClick={()=>go("home")}>首页</button><button className={isAssessment?"active":""} aria-current={isAssessment?"page":undefined} onClick={()=>go("assessment")}>开始自查</button><button className={view==="toolbox"?"active":""} aria-current={view==="toolbox"?"page":undefined} onClick={()=>openDesk()}>工具箱</button></nav>
   <div className="header-utilities">{!isInternalWorkspace&&<button className="account-entry" onClick={()=>go("account")}>注册 / 登录</button>}<details className="header-more" ref={menuRef}><summary>更多<ChevronDown size={16}/></summary><button aria-label="资料中心" className={isReference?"utility-active":""} onClick={()=>go(lastReference)}><Globe2 size={19}/><span>资料中心</span></button><button aria-label="我的报告" className={view==="history"?"utility-active":""} onClick={()=>go("history")}><FolderOpen size={19}/><span>我的报告</span></button></details><span className="workspace-badge"><i/>{isInternalWorkspace?"内部工作台":"出海合规"}</span></div>
  </div></header>
  {!canCheckApi&&internalWorkspaceUrl&&<div className="public-experience"><div className="wrap"><p><b>公开体验</b><span>法规检索与真实 AI 分析限内部授权账号使用。</span></p><a href={internalWorkspaceUrl}>进入内部工作台<ArrowUpRight size={18}/></a></div></div>}
  {isReference&&<div className="context-bar"><nav className="wrap context-tabs" aria-label="资料中心"><span>资料中心</span>{REFERENCE_TABS.map(([id,label])=><button key={id} className={view===id?"active":""} aria-current={view===id?"page":undefined} onClick={()=>go(id)}>{label}</button>)}</nav></div>}
  {view==="account"&&<AccountPanel onDone={()=>go("assessment")}/>}
  {view==="home"&&<main className="clean-home">
   <section className="clean-hero wrap"><div className="clean-copy"><span className="clean-label">新加坡 · 马来西亚 · 泰国 · 印度尼西亚</span><h1>出海合规，<br/>一步步更清晰。</h1><p>提交材料，读懂风险，继续处理。</p><div className="clean-actions"><button className="primary-button" onClick={()=>go("assessment")}>开始自查<ArrowRight size={21}/></button><button className="text-button" onClick={()=>go("example")}>查看报告示例<ArrowUpRight size={19}/></button></div><span className="clean-scope"><ShieldCheck size={18}/>{canCheckApi?"内部使用 · 结果供专业复核":"公开演示 · 真实检测需授权"}</span></div>
   <div className="clean-flow" aria-label="使用流程"><div className="clean-flow-heading"><h2>四步完成自查</h2></div><ol>{JOURNEY.map((item,i)=><li key={item.n}><span className={i===0?"flow-number current":"flow-number"}>{item.n}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>{i===3&&<ChevronRight size={20}/>}</li>)}</ol></div></section>
   <section className="clean-continue wrap"><div><h2>已有报告？</h2><p>继续读报告、准备文档。</p></div><button className="secondary-button" onClick={()=>openDesk()}>进入工具箱<ArrowRight size={19}/></button></section>
  </main>}
  {assessmentStarted&&<div hidden={view!=="assessment"}><AssessmentWorkflow key={assessmentKey} initialProfile={profile} active={view==="assessment"} onDirtyChange={setAssessmentDirty} {...reportActions}/></div>}
  {deskStarted&&<div hidden={view!=="toolbox"}><ComplianceDesk report={latestReport} entries={entries} initialTab={deskTab} requestId={deskRequest} onStart={()=>go("assessment")} onSave={save} onOpenLibrary={()=>go("laws")} onBackReport={backToReport} contexts={contexts} active={view==="toolbox"}/></div>}
  {lawsStarted&&<div hidden={view!=="laws"}>{canCheckApi?<RegulationLibrary active={view==="laws"}/>:<LawsTool/>}</div>}
  {view==="cases"&&<CasesTool key={relatedCountry||"all"} initialCountry={relatedCountry} onAssess={c=>start({country_list:[c],business_type:"ecommerce",data_transfer:"unknown"})}/>}
  {compareStarted&&<div hidden={view!=="compare"}><CompareTool onSave={save}/></div>}
  {view==="history"&&<HistoryTool entries={entries} onDelete={id=>setEntries(deleteHistory(id))} onClear={()=>{clearHistory();setEntries([]);}} onResume={start} onOpenReport={backToReport}/>}
  {view==="report"&&latestReport&&<AssessmentWorkflow key={latestReport.report_id} initialReport={latestReport} enableMcp={false} {...reportActions}/>}
  {view==="example"&&<AssessmentWorkflow initialExample enableMcp={false} {...reportActions}/>}
  {pendingProfile&&<AccessibleModal label="开始新的自查" onClose={()=>setPendingProfile(null)}><h2>开始新的自查</h2><p>这会替换当前填写内容；已保存的结果会保留。</p><div className="action-row"><button className="secondary-button" onClick={()=>setPendingProfile(null)}>保留当前自查</button><button className="primary-button" onClick={()=>{const next=pendingProfile;setPendingProfile(null);replaceAssessment(next);}}>使用新画像继续</button></div></AccessibleModal>}
  {message&&<div className="save-toast" role="status"><Check size={21}/><span>{message}</span><button aria-label="关闭提示" onClick={()=>setMessage("")}><X size={20}/></button></div>}
  <section className="boundary wrap"><ShieldCheck size={25}/><div><b>使用说明</b><details><summary>查看使用边界</summary><p>{DISCLAIMER} 检索资料的现行效力与适用性仍需专业复核。</p></details></div></section>
  <footer className="site-footer wrap"><div><b>东合智检</b><span>企业数据合规自查</span></div></footer>
 </div>;
}
