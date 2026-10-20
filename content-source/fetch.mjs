import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 for(let attempt=0;attempt<3;attempt++){
  try{ const res=await fetch(url,{signal:AbortSignal.timeout(30000)}); if(!res.ok)throw new Error(String(res.status)); return {status:res.status,html:await res.text(),finalUrl:res.url}; }
  catch(e){if(attempt===2)throw e;await delay(1000+attempt*2000);}
 }
}
const index=load(await fs.readFile(path.join(root,'sitemap.xml'),'utf8'),{xmlMode:true});
let urls=[];
for(const el of index('loc').toArray()){
 const url=index(el).text(), result=await get(url);
 await fs.writeFile(path.join(root,new URL(url).pathname.slice(1)),result.html);
 const $=load(result.html,{xmlMode:true});
 urls.push(...$('url>loc').toArray().map(el=>$(el).text()));
}
urls=[...new Set(urls)];
let next=0,results=[];
await Promise.all(Array.from({length:3},async()=>{
 while(next<urls.length){
  const url=urls[next++], pathname=new URL(url).pathname, file=pathname==='/'?'home.html':pathname.slice(1)+'.html';
  try{
   const result=await get(url);
   await fs.writeFile(path.join(root,'raw',file),result.html);
   results.push({url,path:pathname,status:result.status,finalUrl:result.finalUrl,file,bytes:Buffer.byteLength(result.html)});
   console.log(`${results.length}/${urls.length} ${result.status} ${pathname}`);
  }catch(e){results.push({url,path:pathname,error:String(e)});console.log('ERROR '+url+' '+e);}
  await delay(250);
 }
}));
await fs.writeFile(path.join(root,'fetch-log.json'),JSON.stringify(results,null,2));
