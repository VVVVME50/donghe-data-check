"use client";
import { useRef, useState } from "react";
import { FileText, LoaderCircle, Paperclip, UploadCloud, X } from "lucide-react";
import { MATERIAL_ACCEPT, MAX_MATERIALS, MAX_TOTAL_BYTES, readMaterial, releaseMaterials, type Material } from "@/lib/materials";
export default function MaterialPicker({items,onChange,onError,onBusy,compact=false,disabled=false}:{items:Material[];onChange:(items:Material[])=>void;onError:(error:string)=>void;onBusy?:(busy:boolean)=>void;compact?:boolean;disabled?:boolean}){
 const [busy,setBusy]=useState(false);const locked=useRef(false);const [dragging,setDragging]=useState(false);
 async function add(files:File[]){if(locked.current||disabled||!files.length)return;onError("");if(items.length+files.length>MAX_MATERIALS){onError("最多 5 个文件。");return;}if([...items.map(i=>i.file),...files].reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL_BYTES){onError("文件总大小不能超过 10 MB。");return;}locked.current=true;setBusy(true);onBusy?.(true);const added:Material[]=[];
  try{for(const file of files)added.push(await readMaterial(file));if([...items,...added].reduce((sum,i)=>sum+(i.text?.length||0),0)>60000)throw new Error("本次材料文字总计不能超过 6 万字。");onChange([...items,...added]);}
  catch(e){releaseMaterials(added);onError(e instanceof Error?e.message:"文件无法读取，请重试。");}finally{locked.current=false;setBusy(false);onBusy?.(false);}
 }
 return <div className={compact?"material-picker compact-picker":"material-picker"}>
 {items.length<MAX_MATERIALS&&<label className={`file-drop ${compact?"compact-drop":""} ${dragging?"dragging":""} ${disabled||busy?"disabled":""}`} onDragOver={e=>{e.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void add(Array.from(e.dataTransfer.files));}}>
 <input type="file" multiple accept={MATERIAL_ACCEPT} disabled={busy||disabled} aria-label="添加材料" onChange={e=>{void add(Array.from(e.target.files||[]));e.target.value="";}}/>{busy?<LoaderCircle size={22} className="spin"/>:compact?<Paperclip size={20}/>:<UploadCloud size={30}/>}<b>{busy?"正在读取文件":compact?"添加材料":"点击或拖入文件"}</b>{!compact&&<span>JPG、PNG、PDF、DOCX · 最多 5 个</span>}</label>}
 {items.length>0&&<ul className="material-list">{items.map(item=><li key={item.id}>{item.kind==="image"?<img src={item.url} alt="材料预览"/>:<FileText size={24}/>}<div><b title={item.name}>{item.name}</b><span>{item.kind==="document"?`已读取 ${item.text?.length} 字`:`${(item.size/1024).toFixed(0)} KB`}</span></div><button type="button" aria-label={`删除 ${item.name}`} disabled={busy||disabled} onClick={()=>{releaseMaterials([item]);onChange(items.filter(i=>i.id!==item.id));}}><X size={18}/></button></li>)}</ul>}
 </div>;
}
