import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'image-manifest.json'),'utf8'));
const data=JSON.parse(await fs.readFile(path.join(root,'site-data.json'),'utf8'));
const audit=JSON.parse(await fs.readFile(path.join(root,'audit.json'),'utf8'));
await fs.mkdir(path.join(root,'assets'),{recursive:true});
let cursor=0;
await Promise.all(Array.from({length:3},async()=>{
 while(cursor<manifest.length){
  const item=manifest[cursor++],u=new URL(item.sourceUrl);
  const filename=crypto.createHash('sha1').update(item.sourceUrl).digest('hex').slice(0,10)+'-'+decodeURIComponent(path.basename(u.pathname)).replace(/[^a-zA-Z0-9_.-]/g,'_');
  for(let attempt=0;attempt<3;attempt++){
   try{
    const res=await fetch(item.sourceUrl,{signal:AbortSignal.timeout(30000)});
    if(!res.ok)throw new Error('HTTP '+res.status);
    if(!res.headers.get('content-type')?.startsWith('image/'))throw new Error('Not image: '+res.headers.get('content-type'));
    const bytes=Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(root,'assets',filename),bytes);
    Object.assign(item,{filename,localUrl:'/assets/imported/'+filename,status:res.status,bytes:bytes.length,contentType:res.headers.get('content-type')});
    break;
   }catch(e){item.error=String(e);await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
  }
  if(item.status)delete item.error;
  console.log((item.status||'ERROR')+' '+filename);
 }
}));
const mapping=new Map(manifest.filter(x=>x.localUrl).map(x=>[x.sourceUrl,x.localUrl]));
for(const page of data.pages){
 for(const img of page.images){if(mapping.has(img.url)){img.sourceUrl=img.url;img.url=mapping.get(img.url);}}
 for(const [source,local]of mapping)page.bodyHtml=page.bodyHtml.replaceAll(source,local);
}
if(mapping.has(data.company.logoUrl)){data.company.logoSourceUrl=data.company.logoUrl;data.company.logoUrl=mapping.get(data.company.logoUrl);}
audit.assets={total:manifest.length,downloaded:manifest.filter(x=>x.status).length,failed:manifest.filter(x=>x.error).map(x=>({url:x.sourceUrl,error:x.error})),totalBytes:manifest.reduce((sum,x)=>sum+(x.bytes||0),0)};
await fs.writeFile(path.join(root,'site-data.json'),JSON.stringify(data,null,2));
await fs.writeFile(path.join(root,'image-manifest.json'),JSON.stringify(manifest,null,2));
await fs.writeFile(path.join(root,'audit.json'),JSON.stringify(audit,null,2));
console.log(audit.assets);
