export type Material={id:string;name:string;size:number;kind:"image"|"document";url?:string;file:File;text?:string};
export type MaterialContext={description:string;documents:{name:string;text:string}[];images:{name:string;data:string;mime:string}[]};
export const MAX_MATERIALS=5;
export const MAX_TOTAL_BYTES=10*1024*1024;
export const MATERIAL_ACCEPT="image/jpeg,image/png,application/pdf,.docx";
export function releaseMaterials(items:Material[]){items.forEach(item=>{if(item.url)URL.revokeObjectURL(item.url);});}
export async function readMaterial(file:File):Promise<Material>{
 if(!file.size||file.size>5*1024*1024)throw new Error("单个文件需为 1 B–5 MB。");
 const base={id:crypto.randomUUID(),name:file.name,size:file.size,file};
 if(["image/jpeg","image/png"].includes(file.type)){
  const bitmap=await createImageBitmap(file);bitmap.close();return {...base,kind:"image",url:URL.createObjectURL(file)};
 }
 const bytes=new Uint8Array(await file.arrayBuffer());let text="";
 if(/\.pdf$/i.test(file.name)&&new TextDecoder().decode(bytes.subarray(0,5))==="%PDF-"){
  const pdfjs=await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdf.worker.min.mjs",document.baseURI).href;
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});
  const timer=setTimeout(()=>void task.destroy().catch(()=>{}),20000);
  try{const pdf=await task.promise;if(pdf.numPages>30)throw new Error("PDF 请控制在 30 页以内。");
   const pages:string[]=[];for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();const value=content.items.map(item=>"str" in item?item.str:"").join(" ").trim();if(!value)throw new Error(`PDF 第 ${n} 页无可读文字，请将扫描页另存为图片上传。`);pages.push(`[第 ${n} 页]\n${value}`);if(pages.join("\n").length>30000)throw new Error("文件文字过多，请拆分后上传。");}text=pages.join("\n\n");
  }finally{clearTimeout(timer);await task.destroy().catch(()=>{});}
 }else if(/\.docx$/i.test(file.name)&&bytes[0]===80&&bytes[1]===75){
  const {unzipSync,strFromU8}=await import("fflate");
  let tooLarge=false;const entries=unzipSync(bytes,{filter:entry=>{if(entry.name!=="word/document.xml")return false;if(entry.originalSize>2*1024*1024){tooLarge=true;return false;}return true;}});
  if(tooLarge)throw new Error("Word 内容过大，请拆分后上传。");
  const xml=entries["word/document.xml"];if(!xml)throw new Error("无法读取 Word 正文，请另存为 DOCX 后重试。");
  const doc=new DOMParser().parseFromString(strFromU8(xml),"application/xml");if(doc.querySelector("parsererror"))throw new Error("Word 文件格式有误。");
  text=Array.from(doc.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main","p")).map(p=>Array.from(p.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main","t")).map(t=>t.textContent||"").join("")).join("\n");
 }else throw new Error("支持 JPG、PNG、PDF 和 Word（DOCX）。旧版 DOC 请先另存为 DOCX。");
 if(text.trim().length<10)throw new Error("未读到足够文字，请上传清晰截图或填写描述。");
 if(text.length>30000)throw new Error("文件文字超过 3 万字，请拆分后上传。");
 return {...base,kind:"document",text};
}
export async function materialContext(description:string,items:Material[]):Promise<MaterialContext>{
 const images=await Promise.all(items.filter(i=>i.kind==="image").map(async item=>{const bytes=new Uint8Array(await item.file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {name:item.name,mime:item.file.type,data:btoa(binary)};}));
 return {description,documents:items.filter(i=>i.kind==="document").map(i=>({name:i.name,text:i.text!})),images};
}
