import { Check } from "lucide-react";
const STEPS=["业务画像","提交材料","报告预览","合规工具箱"];
export default function JourneySteps({step}:{step:number}){
 return <ol className="journey-steps" aria-label="自查进度">{STEPS.map((title,index)=><li className={index===step?"current":index<step?"done":""} key={title} aria-current={index===step?"step":undefined}><span>{index<step?<Check size={17}/>:index+1}</span><b>{title}</b></li>)}</ol>;
}
