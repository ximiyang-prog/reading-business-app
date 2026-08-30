const API_BASE=(window.TRUE_READ_API_BASE||'https://read-api.ximiyang.com').replace(/\/$/,'');
async function apiPost(path,body){if(!API_BASE)throw new Error('AI 服务地址尚未配置');const r=await fetch(`${API_BASE}${path}`,{method:'POST',body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.message||`服务请求失败（${r.status}）`);return data.data}
const generateFromSource=(bookName,audience,sourceText,sourceType,platform,sourceAnalysis)=>apiPost('/api/generate',{bookName,audience,sourceText,sourceType,platform,sourceAnalysis});
const analyzeBookSource=(bookName,sourceText,documentName)=>apiPost('/api/analyze-source',{bookName,sourceText,documentName});
const rewriteContent=payload=>apiPost('/api/rewrite',payload);
const extractBookQuotes=(bookName,audience,sourceText,documentName)=>apiPost('/api/quotes',{bookName,audience,sourceText,documentName});
function markParagraphs(text){return String(text||'').split(/\n\s*\n|\r?\n/).map(x=>x.trim()).filter(Boolean).map((x,i)=>`【第${i+1}段】${x}`).join('\n')}
function markupText(source){const doc=new DOMParser().parseFromString(source,'text/html');return markParagraphs(doc.body?.innerText||doc.documentElement?.textContent||'')}
const MAX_UPLOAD_BYTES=50*1024*1024,RECOGNITION_PACKET_CHARS=24000,MAX_AI_CONTEXT_CHARS=116000,MAX_CONTEXT_PACKETS=24;
function splitRecognitionPackets(source){const text=String(source||'').trim(),packets=[];let start=0;while(start<text.length){let end=Math.min(start+RECOGNITION_PACKET_CHARS,text.length);if(end<text.length){const boundary=Math.max(text.lastIndexOf('\n',end),text.lastIndexOf('。',end)+1);if(boundary>start+RECOGNITION_PACKET_CHARS*.65)end=boundary}packets.push({index:packets.length+1,start,end,text:text.slice(start,end).trim()});start=end}return packets.filter(x=>x.text)}
function distributedIndexes(total,count){if(total<=count)return Array.from({length:total},(_,i)=>i);return [...new Set(Array.from({length:count},(_,i)=>Math.round(i*(total-1)/(count-1))))]}
function excerptPacket(text,budget){if(text.length<=budget)return text;const part=Math.max(120,Math.floor(budget/3)),middle=Math.max(0,Math.floor(text.length/2-part/2));return `${text.slice(0,part)}\n【识别包中段】${text.slice(middle,middle+part)}\n【识别包末段】${text.slice(-part)}`.slice(0,budget)}
function buildRecognitionContext(source){const text=String(source||'').trim(),packets=splitRecognitionPackets(text),indexes=distributedIndexes(packets.length,Math.min(MAX_CONTEXT_PACKETS,packets.length)),budget=Math.max(2800,Math.floor((MAX_AI_CONTEXT_CHARS-indexes.length*80)/Math.max(indexes.length,1))),parts=indexes.map(i=>{const p=packets[i];return `【识别包 ${p.index}/${packets.length}｜原文字符 ${p.start+1}-${p.end}】\n${excerptPacket(p.text,budget)}`});const context=parts.join('\n\n').slice(0,MAX_AI_CONTEXT_CHARS);window.trueReadRecognitionInfo={originalChars:text.length,packetCount:packets.length,usedPacketCount:indexes.length,contextChars:context.length};return context}
async function extractEpub(file){if(!window.JSZip)throw new Error('EPUB 解析组件加载失败');const zip=await JSZip.loadAsync(await file.arrayBuffer()),names=Object.keys(zip.files).filter(n=>/\.(xhtml|html|htm)$/i.test(n)&&!zip.files[n].dir).sort();let text='';for(let i=0;i<names.length;i++){const raw=await zip.files[names[i]].async('text'),doc=new DOMParser().parseFromString(raw,'application/xhtml+xml'),title=doc.querySelector('title,h1,h2')?.textContent?.trim()||`章节 ${i+1}`,body=doc.body?.textContent||doc.documentElement?.textContent||'';text+=`【第${i+1}章：${title.slice(0,40)}】${body.replace(/\s+/g,' ').trim()}\n`}if(text.length<100)throw new Error('EPUB 中未提取到足够正文');return text}
function extractRtf(text){return markParagraphs(text.replace(/\\par[d]?/g,'\n').replace(/\\'[0-9a-f]{2}/gi,'').replace(/\\[a-z]+-?\d* ?/gi,'').replace(/[{}]/g,''))}
async function extractDocument(file){
 if(file.size>MAX_UPLOAD_BYTES)throw new Error('文档请控制在 50MB 以内');
 let extracted='';
 if(/\.(txt|md)$/i.test(file.name))extracted=markParagraphs(await file.text());
 else if(/\.pdf$/i.test(file.name)){if(!window.pdfjsLib)throw new Error('PDF 解析组件加载失败');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();extracted+=`【第${i}页】`+content.items.map(x=>x.str).join(' ')+'\n'}}
 else if(/\.docx$/i.test(file.name)){if(!window.mammoth)throw new Error('Word 解析组件加载失败');const out=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});extracted=markParagraphs(out.value)}
 else if(/\.epub$/i.test(file.name))extracted=await extractEpub(file);
 else if(/\.fb2$/i.test(file.name)){const raw=await file.text(),doc=new DOMParser().parseFromString(raw,'application/xml'),sections=[...doc.querySelectorAll('section')];extracted=sections.map((s,i)=>`【第${i+1}节】${s.textContent.replace(/\s+/g,' ').trim()}`).join('\n')}
 else if(/\.html?$/i.test(file.name))extracted=markupText(await file.text());
 else if(/\.rtf$/i.test(file.name))extracted=extractRtf(await file.text());
 else throw new Error('暂不支持此格式；请使用 EPUB、PDF、DOCX、TXT、Markdown、FB2、HTML 或 RTF');
 if(extracted.trim().length<100)throw new Error('文档可提取文字过少，请检查文件内容');
 return buildRecognitionContext(extracted)
}
