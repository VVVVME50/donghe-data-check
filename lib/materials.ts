export type MaterialVisual={page:number;file:File;url:string};
export type Material={id:string;name:string;size:number;kind:"image"|"document";url?:string;file:File;text?:string;visuals?:MaterialVisual[];pageCount?:number};
export type MaterialContext={description:string;documents:{name:string;text:string}[];images:{name:string;data:string;mime:string}[]};
export const MAX_MATERIALS=5;
export const MAX_VISUAL_PAGES=10;
export const MAX_TOTAL_BYTES=10*1024*1024;
export const MATERIAL_ACCEPT="image/jpeg,image/png,application/pdf,.docx";
export function releaseMaterials(items:Material[]){items.forEach(item=>{if(item.url)URL.revokeObjectURL(item.url);item.visuals?.forEach(page=>URL.revokeObjectURL(page.url));});}
export function materialVisualCount(items:Material[]){return items.reduce((n,item)=>n+(item.kind==="image"?1:item.visuals?.length||0),0);}
function meaningfulText(value:string){return (value.match(/[\p{L}\p{N}]/gu)||[]).length>=10;}
export async function readMaterial(file:File,onProgress?:(message:string)=>void):Promise<Material>{
 if(!file.size||file.size>5*1024*1024)throw new Error("单个文件不能超过 5 MB，且不能为空。");
 const base={id:crypto.randomUUID(),name:file.name,size:file.size,file};
 if(["image/jpeg","image/png"].includes(file.type)){
  try{const bitmap=await createImageBitmap(file);bitmap.close();}catch{throw new Error("图片无法读取，请重新选择有效图片。");}return {...base,kind:"image",url:URL.createObjectURL(file)};
 }
 const bytes=new Uint8Array(await file.arrayBuffer());let text="";const visuals:MaterialVisual[]=[];let pageCount:number|undefined;
 if(/\.pdf$/i.test(file.name)&&new TextDecoder().decode(bytes.subarray(0,5))==="%PDF-"){
  const pdfjs=await import("pdfjs-dist");pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdf.worker.min.mjs",document.baseURI).href;
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true});let timedOut=false;const timer=setTimeout(()=>{timedOut=true;void task.destroy().catch(()=>{});},60000);
  try{const pdf=await task.promise;pageCount=pdf.numPages;if(pdf.numPages>30)throw new Error("PDF 请控制在 30 页以内。");const pages:string[]=[];
   for(let n=1;n<=pdf.numPages;n++){
    onProgress?.(`正在处理 PDF 第 ${n} / ${pdf.numPages} 页`);
    const page=await pdf.getPage(n);let value="";try{const content=await page.getTextContent();value=content.items.map(item=>"str" in item?item.str:"").join(" ").trim();}catch{/* Retain the page visually when its text layer is unusable. */}
    let hasRaster=false;try{const ops=await page.getOperatorList();hasRaster=ops.fnArray.some(op=>[pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintImageXObjectRepeat,pdfjs.OPS.paintImageMaskXObject].includes(op));}catch{hasRaster=true;}
    if(meaningfulText(value))pages.push(`[第 ${n} 页]\n${value}`);
    if(hasRaster||!meaningfulText(value)){

     const natural=page.getViewport({scale:1});const scale=Math.min(2,1800/Math.max(natural.width,natural.height));const viewport=page.getViewport({scale});const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("浏览器暂不支持 PDF 图片转换，请换用较新浏览器。");
     try{await page.render({canvas,canvasContext:context,viewport,background:"#ffffff",annotationMode:pdfjs.AnnotationMode.DISABLE}).promise;
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let ink=false;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>0&&(pixels[i]<245||pixels[i+1]<245||pixels[i+2]<245)){ink=true;break;}}
      if(ink){if(visuals.length>=MAX_VISUAL_PAGES)throw new Error("扫描或图片页超过 10 页，请拆分 PDF 后上传。");const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.86));if(!blob||blob.size>2*1024*1024)throw new Error(`PDF 第 ${n} 页图片过大，请压缩或拆分后上传。`);const image=new File([blob],`${file.name.replace(/\.pdf$/i,"")}-第${n}页.jpg`,{type:"image/jpeg"});visuals.push({page:n,file:image,url:URL.createObjectURL(image)});}
     }finally{canvas.width=0;canvas.height=0;}
    }
    if(pages.join("\n").length>30000)throw new Error("文件文字超过 3 万字，请拆分后上传。");page.cleanup();
   }
   text=pages.join("\n\n");if(!text&&!visuals.length)throw new Error("PDF 未包含可读文字或有效图像，请检查文件内容。");
  }catch(error){visuals.forEach(page=>URL.revokeObjectURL(page.url));if(timedOut)throw new Error("PDF 处理超时，请拆分或压缩后重试。");if(error instanceof Error&&error.name==="PasswordException")throw new Error("PDF 有密码保护，请先解锁后上传。");if(error instanceof Error&&["InvalidPDFException","MissingPDFException","UnknownErrorException"].includes(error.name))throw new Error("PDF 文件无法读取，请重新导出后上传。");throw error;
  }finally{clearTimeout(timer);await task.destroy().catch(()=>{});}
 }else if(/\.docx$/i.test(file.name)&&bytes[0]===80&&bytes[1]===75){
  const {unzipSync,strFromU8}=await import("fflate");let tooLarge=false;const entries=unzipSync(bytes,{filter:entry=>{if(entry.name!=="word/document.xml")return false;if(entry.originalSize>2*1024*1024){tooLarge=true;return false;}return true;}});if(tooLarge)throw new Error("Word 内容过大，请拆分后上传。");const xml=entries["word/document.xml"];if(!xml)throw new Error("无法读取 Word 正文，请另存为 DOCX 后重试。");const doc=new DOMParser().parseFromString(strFromU8(xml),"application/xml");if(doc.querySelector("parsererror"))throw new Error("Word 文件格式有误。");text=Array.from(doc.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main","p")).map(p=>Array.from(p.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main","t")).map(t=>t.textContent||"").join("")).join("\n");
 }else throw new Error("支持 JPG、PNG、PDF 和 Word（DOCX）。旧版 DOC 请先另存为 DOCX。");
 if(!meaningfulText(text)&&!visuals.length)throw new Error("未读到足够文字或图片，请检查文件内容。");if(text.length>30000)throw new Error("文件文字超过 3 万字，请拆分后上传。");return {...base,kind:"document",text:meaningfulText(text)?text:undefined,visuals,pageCount};
}
async function imageData(file:File){const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {name:file.name,mime:file.type,data:btoa(binary)};}
export async function materialContext(description:string,items:Material[]):Promise<MaterialContext>{
 const files=items.flatMap(item=>item.kind==="image"?[item.file]:(item.visuals||[]).map(page=>page.file));if(files.length>MAX_VISUAL_PAGES)throw new Error("图片与扫描页合计最多 10 页，请减少材料后重试。");if(files.reduce((n,file)=>n+file.size,0)>MAX_TOTAL_BYTES)throw new Error("转换后的图片总计超过 10 MB，请拆分材料后重试。");
 return {description,documents:items.filter(i=>i.kind==="document"&&i.text).map(i=>({name:i.name,text:i.text!})),images:await Promise.all(files.map(imageData))};
}
export async function appendMaterialForm(form:FormData,context:MaterialContext){
 form.set("documents",JSON.stringify(context.documents));for(const image of context.images){const bytes=Uint8Array.from(atob(image.data),char=>char.charCodeAt(0));form.append("images",new File([bytes],image.name,{type:image.mime}));}
}
