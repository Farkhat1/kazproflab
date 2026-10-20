import fs from 'node:fs/promises';
import {load} from 'cheerio';
const $=load(await fs.readFile('content-source/raw/home.html','utf8'));
const one=s=>String(s||'').replace(/\s+/g,' ').trim();
const note='Не использовать формулировки, предполагающие оказание ТОО «КазПроф Лаб» услуг по поверке или калибровке.';
function html(el){
 const x=load($(el).prop('outerHTML')||'',null,false);
 x('style,script,img').remove();
 x('*').each((_,e)=>{for(const a of Object.keys(e.attribs))if(a!=='href')x(e).removeAttr(a)});
 return x.html().replace(note,'').replace(/(<br>\s*)+<\/p>/g,'</p>');
}
function link(el){if(!el.length)return undefined;return {label:one(el.text()),path:new URL(el.attr('href'),'https://kazproflab.kz').pathname};}
const sections=$('.uc-title').toArray().map(el=>one($(el).text()));
const data={
 sourceUrl:'https://kazproflab.kz/',fetchedAt:new Date().toISOString(),
 intro:{
  title:one($('.ucv-a2-header').text()),tagline:one($('.ucv-a2-sub-header').text()),
  paragraphs:$('.ucv-a2-texts > p:not(.ucv-a2-sub-header)').toArray().filter(el=>!$(el).find('a').length).map(el=>({html:html(el)})),
  link:link($('.ucv-a2-link'))
 },
 sectionTitles:{services:sections[0],audiences:sections[1],benefits:sections[2],process:sections[3]},
 services:$('.uc-clapperboard__item').toArray().map(el=>({
  title:one($(el).find('.uc-clapper__subheader').text()),
  paragraphs:$(el).find('.uc-board > p').toArray().map(p=>html(p)),
  link:link($(el).find('.uc-clapper-button'))
 })),
 servicesLink:link($('.uc-clapperboard .uc-btns')),
 audiences:$('.uc-push-text').toArray().map(el=>({title:one($(el).find('p').first().text()),bodyHtml:$(el).find('p').toArray().slice(1).map(p=>html(p)).join('')})),
 benefits:$('.four-item').toArray().map(el=>({title:one($(el).find('.four-header').text()),bodyHtml:html($(el).find('.four-text').get(0))})),
 process:$('.uc-nombers-scheme').toArray().map(el=>({number:one($(el).children('strong').text()),title:one($(el).find('p').first().text()),bodyHtml:$(el).find('p').toArray().slice(1).map(p=>html(p)).join('')})),
 processLink:link($('.b-user-content .uc-btns').last())
};
await fs.writeFile('content-source/home-content.json',JSON.stringify(data,null,2));
console.log({introParagraphs:data.intro.paragraphs.length,services:data.services.length,audiences:data.audiences.length,benefits:data.benefits.length,process:data.process.length});

// Include source course characteristics as semantic tables in already-localized data.
const site=JSON.parse(await fs.readFile('content-source/site-data.json','utf8'));
const audit=JSON.parse(await fs.readFile('content-source/audit.json','utf8'));
const fetched=JSON.parse(await fs.readFile('content-source/fetch-log.json','utf8'));
let count=0;
for(const page of site.pages.filter(x=>x.type==='service')){
 const raw=load(await fs.readFile('content-source/raw/'+fetched.find(x=>x.path===page.path).file,'utf8'));
 const table=raw('[data-qaid="characteristics_block"]').clone();
 if(table.length&&!page.bodyHtml.includes('<table')){
  table.find('*').addBack().each((_,el)=>{for(const attr of Object.keys(el.attribs))if(attr!=='colspan'&&attr!=='rowspan')raw(el).removeAttr(attr)});
  const html='<h2>Характеристики</h2>'+raw.html(table);
  page.bodyHtml+=html;
  page.text+='\n\nХарактеристики\n'+table.text().replace(/\s+/g,' ').trim();
  page.characteristics=table.find('tr').toArray().filter(el=>raw(el).find('td').length).map(el=>({name:one(raw(el).find('td').first().text()),value:one(raw(el).find('td').last().text())}));
  const item=audit.pages.find(x=>x.path===page.path);
  item.contentCharacters=page.text.length;item.bodyHtmlCharacters=page.bodyHtml.length;item.characteristics=page.characteristics.length;
  count++;
 }
}
audit.courseCharacteristicsTables=site.pages.filter(p=>p.characteristics?.length).length;
await fs.writeFile('content-source/site-data.json',JSON.stringify(site,null,2));
await fs.writeFile('content-source/audit.json',JSON.stringify(audit,null,2));
console.log({tablesAdded:count});
