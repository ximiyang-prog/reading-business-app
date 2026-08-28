const API_BASE=(window.TRUE_READ_API_BASE||localStorage.getItem('trueReadApiBase')||'https://reading-business-api.susu19850505.workers.dev').replace(/\/$/,'');
async function apiPost(path,body){if(!API_BASE)throw new Error('AI 服务地址尚未配置');const r=await fetch(`${API_BASE}${path}`,{method:'POST',body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.message||`服务请求失败（${r.status}）`);return data.data}
const generateFromSource=(bookName,audience,sourceText,sourceType,platform)=>apiPost('/api/generate',{bookName,audience,sourceText,sourceType,platform});
const rewriteContent=payload=>apiPost('/api/rewrite',payload);
const extractBookQuotes=(bookName,audience,sourceText,documentName)=>apiPost('/api/quotes',{bookName,audience,sourceText,documentName});
function markParagraphs(text){return String(text||'').split(/\n\s*\n|\r?\n/).map(x=>x.trim()).filter(Boolean).map((x,i)=>`【第${i+1}段】${x}`).join('\n')}
function markupText(source){const doc=new DOMParser().parseFromString(source,'text/html');return markParagraphs(doc.body?.innerText||doc.documentElement?.textContent||'')}
async function extractEpub(file){if(!window.JSZip)throw new Error('EPUB 解析组件加载失败');const zip=await JSZip.loadAsync(await file.arrayBuffer()),names=Object.keys(zip.files).filter(n=>/\.(xhtml|html|htm)$/i.test(n)&&!zip.files[n].dir).sort();let text='';for(let i=0;i<names.length;i++){const raw=await zip.files[names[i]].async('text'),doc=new DOMParser().parseFromString(raw,'application/xhtml+xml'),title=doc.querySelector('title,h1,h2')?.textContent?.trim()||`章节 ${i+1}`,body=doc.body?.textContent||doc.documentElement?.textContent||'';text+=`【第${i+1}章：${title.slice(0,40)}】${body.replace(/\s+/g,' ').trim()}\n`;if(text.length>=120000)break}if(text.length<100)throw new Error('EPUB 中未提取到足够正文');return text.slice(0,120000)}
function extractRtf(text){return markParagraphs(text.replace(/\\par[d]?/g,'\n').replace(/\\'[0-9a-f]{2}/gi,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,'')).slice(0,120000)}
async function extractDocument(file){
 if(file.size>20*1024*1024)throw new Error('文档请控制在 20MB 以内');
 if(/\.(txt|md)$/i.test(file.name))return markParagraphs(await file.text()).slice(0,120000);
 if(/\.pdf$/i.test(file.name)){if(!window.pdfjsLib)throw new Error('PDF 解析组件加载失败');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();text+=`【第${i}页】`+content.items.map(x=>x.str).join(' ')+'\n';if(text.length>=120000)break}return text.slice(0,120000)}
 if(/\.docx$/i.test(file.name)){if(!window.mammoth)throw new Error('Word 解析组件加载失败');const out=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return markParagraphs(out.value).slice(0,120000)}
 if(/\.epub$/i.test(file.name))return extractEpub(file);
 if(/\.fb2$/i.test(file.name)){const raw=await file.text(),doc=new DOMParser().parseFromString(raw,'application/xml'),sections=[...doc.querySelectorAll('section')];return sections.map((s,i)=>`【第${i+1}节】${s.textContent.replace(/\s+/g,' ').trim()}`).join('\n').slice(0,120000)}
 if(/\.html?$/i.test(file.name))return markupText(await file.text()).slice(0,120000);
 if(/\.rtf$/i.test(file.name))return extractRtf(await file.text());
 throw new Error('暂不支持此格式；请使用 EPUB、PDF、DOCX、TXT、Markdown、FB2、HTML 或 RTF')
}
