const API_BASE=(window.TRUE_READ_API_BASE||localStorage.getItem('trueReadApiBase')||'https://reading-business-api.susu19850505.workers.dev').replace(/\/$/,'');
async function apiPost(path,body){if(!API_BASE)throw new Error('AI 服务地址尚未配置');const r=await fetch(`${API_BASE}${path}`,{method:'POST',body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw new Error(data.message||`服务请求失败（${r.status}）`);return data.data}
const lookupBook=bookName=>apiPost('/api/lookup',{bookName});
const generateFromSource=(bookName,audience,sourceText,sourceType,platform)=>apiPost('/api/generate',{bookName,audience,sourceText,sourceType,platform});
const generateFromWeb=(bookName,audience,platform)=>apiPost('/api/web-search',{bookName,audience,platform,userConsent:true});
const rewriteContent=payload=>apiPost('/api/rewrite',payload);
async function extractDocument(file){
 if(file.size>20*1024*1024)throw new Error('文档请控制在 20MB 以内');
 if(/\.(txt|md)$/i.test(file.name))return(await file.text()).slice(0,120000);
 if(/\.pdf$/i.test(file.name)){if(!window.pdfjsLib)throw new Error('PDF 解析组件加载失败');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();text+=content.items.map(x=>x.str).join(' ')+'\n';if(text.length>=120000)break}return text.slice(0,120000)}
 if(/\.docx$/i.test(file.name)){if(!window.mammoth)throw new Error('Word 解析组件加载失败');const out=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return out.value.slice(0,120000)}
 throw new Error('暂不支持旧版 .doc，请另存为 .docx、PDF、TXT 或 Markdown')
}
