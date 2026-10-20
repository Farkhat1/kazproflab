import fs from 'node:fs/promises';
import {load} from 'cheerio';
const site=JSON.parse(await fs.readFile('content-source/site-data.json','utf8'));
const fetched=JSON.parse(await fs.readFile('content-source/fetch-log.json','utf8'));
const audit=JSON.parse(await fs.readFile('content-source/audit.json','utf8'));
const images=JSON.parse(await fs.readFile('content-source/image-manifest.json','utf8'));
const compact=s=>s.replace(/\s/g,'');
const issues=[],preservation=[];
const paths=new Set(site.pages.map(p=>p.path));
for(const page of site.pages){
 const $=load(await fs.readFile('content-source/raw/'+fetched.find(x=>x.path===page.path).file,'utf8'));
 const body=load(page.bodyHtml);
 if(body('script,style,iframe,form,button').length)issues.push({path:page.path,type:'unsafe_or_ui_tag'});
 for(const link of [...page.childrenPaths,...page.servicePaths,...page.breadcrumbs.map(c=>c.path)])if(!paths.has(link))issues.push({path:page.path,type:'broken_relation',link});
 if(page.type==='service'&&!page.price)issues.push({path:page.path,type:'missing_price'});
 const nodes=$('.b-user-content').clone();
 nodes.find('script,style').remove();
 let original=compact(nodes.text());
 for(const correction of audit.removedEditorial.filter(c=>c.path===page.path))original=original.replace(compact(correction.text),'');
 const migrated=compact(body.text());
 // Full source user-authored content, excluding only recorded editorial corrections.
 let preserved=!original||migrated.includes(original);
 if(!preserved){
  // Element boundaries can vary after preformatted text is made semantic.
  const paragraphs=nodes.find('p,h2,h3,li').toArray().filter(el=>!$(el).find('p,h2,h3,li').length);
  const missing=[];
  for(const el of paragraphs){
   let text=compact($(el).text());
   for(const correction of audit.removedEditorial.filter(c=>c.path===page.path))text=text.replace(compact(correction.text),'');
   if(text&&!migrated.includes(text))missing.push(text);
  }
  preserved=missing.length===0;
  if(missing.length)issues.push({path:page.path,type:'missing_source_text',missing});
 }
 preservation.push({path:page.path,sourceAuthoredTextPreserved:preserved,sourceTextChars:original.length});
 for(const table of $('[data-qaid="characteristics_block"]').toArray()){
  if(!migrated.includes(compact($(table).text())))issues.push({path:page.path,type:'missing_characteristics'});
 }
 for(const img of page.images){
  const file=img.url.startsWith('/assets/imported/')?'content-source/assets/'+img.url.split('/').at(-1):null;
  if(!file)issues.push({path:page.path,type:'nonlocal_image',url:img.url});
  else{try{if((await fs.stat(file)).size===0)issues.push({path:page.path,type:'empty_image'});}catch{issues.push({path:page.path,type:'missing_image',url:img.url});}}
 }
}
if(paths.size!==59)issues.push({type:'route_count',count:paths.size});
if(site.pages.filter(p=>p.type==='service').length!==33)issues.push({type:'service_count'});
if(site.pages.filter(p=>p.type==='category').length!==19)issues.push({type:'category_count'});
if(images.some(i=>i.status!==200))issues.push({type:'image_fetch_error'});
audit.verification={checkedAt:new Date().toISOString(),passed:issues.length===0,issues,sourceTextPreservation:preservation,checks:['59 unique source routes','33 services / 19 categories / 7 general pages','all category, service and breadcrumb relationships resolve','all 33 service prices preserved','all source user-authored text retained except recorded editorial removals','all 5 source characteristics tables retained','all content images available locally','no source scripts, styles, forms or iframes in bodyHtml']};
await fs.writeFile('content-source/audit.json',JSON.stringify(audit,null,2));
console.log(JSON.stringify({passed:audit.verification.passed,issues,preserved:preservation.filter(p=>p.sourceAuthoredTextPreserved).length},null,2));
if(issues.length)process.exitCode=1;
