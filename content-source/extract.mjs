import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));
const log=JSON.parse(await fs.readFile(path.join(root,'fetch-log.json'),'utf8'));
const one=s=>String(s||'').replace(/\s+/g,' ').trim();
const escape=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const byId=new Map(log.map(x=>[x.path.match(/^\/([pg]\d+)/)?.[1],x.path]).filter(x=>x[0]));
const known=new Set(log.map(x=>x.path));
function normalize(href){
 if(!href)return '';
 try{const u=new URL(href,'https://kazproflab.kz');
  if(/^(www\.)?kazproflab\.kz$/.test(u.hostname)||/^too-kazprof-lab.*\.satu\.kz$/.test(u.hostname)){
   if(u.hash==='#bot')return '/product_list';
   const p=byId.get(u.pathname.match(/^\/([pg]\d+)/)?.[1])||u.pathname;
   return p+u.search+u.hash;
  }
  return href;
 }catch{return href;}
}
const editorial=[],warnings=[],allImages=new Map(),galleryImages=new Map();
function recordImage(url,alt,sourcePath){
 if(!url||url.startsWith('data:'))return;
 url=new URL(url,'https://kazproflab.kz').href;
 if(!allImages.has(url))allImages.set(url,{sourceUrl:url,alt:alt||'',sourcePaths:[]});
 const x=allImages.get(url);if(!x.sourcePaths.includes(sourcePath))x.sourcePaths.push(sourcePath);
}
function cleanHtml(raw,sourcePath,{removeFirstH1=false}={}){
 const $=load('<main>'+raw+'</main>',null,false),main=$('main');
 main.find('script,style,iframe,noscript,form,button,input,select,svg,[data-bazooka="LazyDiv"],.b-online-edit__link,.b-online-edit__vertical-borders,.b-online-edit__horizontal-borders,.b-catalog-panel').remove();
 if(removeFirstH1)main.find('h1').first().remove();
 if(sourcePath==='/p134408347-vnutrennij-audit-provajdera.html'){
  main.find('p,h2,h3').each((_,el)=>{
   const t=one($(el).text());
   if(t.startsWith('Следующая по нашему плану')||t.startsWith('№28.')||t==='Название на Satu'||t==='Описание'||t==='Внутренний аудит провайдера проверки квалификации (ППК) по ГОСТ ISO/IEC 17043-2025'){
    editorial.push({path:sourcePath,text:t,reason:'Published editorial notes / duplicate editorial heading'});$(el).remove();
   }
  });
 }
 main.find('*').each((_,el)=>{
  if(el.type!=='tag')return;
  const item=$(el);
  if(item.attr('class')?.includes('h-pre-wrap'))item.html(item.html().replace(/\n/g,'<br>'));
  if(el.name==='img')recordImage(item.attr('src'),item.attr('alt'),sourcePath);
  for(const key of Object.keys(el.attribs)){
   if(!['href','src','alt','colspan','rowspan'].includes(key))item.removeAttr(key);
  }
  if(el.name==='a'){
   const href=normalize(item.attr('href'));
   if(/^javascript:/i.test(href))item.removeAttr('href');else item.attr('href',href);
   if(!href&&!one(item.text()))item.remove();
  }
 });
 // Remove only the accidentally published instruction, retaining the complete service paragraph.
 let html=main.html();
 const note='Не использовать формулировки, предполагающие оказание ТОО «КазПроф Лаб» услуг по поверке или калибровке.';
 if(html.includes(note)){html=html.replace(note,'');editorial.push({path:sourcePath,text:note,reason:'Published editorial instruction'});}
 const final=load('<main>'+html+'</main>',null,false);
 final('main').find('div,span').each((_,el)=>{
  if(!final(el).text().trim()&&!final(el).find('img,br').length)final(el).remove();
 });
 final('main').find('span').each((_,el)=>final(el).replaceWith(final(el).html()||''));
 return final('main').html().trim().replace(/\n[ \t]+\n/g,'\n').replace('Безналичный расчетОплата услуг по договоренности.','Безналичный расчет. Оплата услуг по договоренности.');
}
function textOf(html){const $=load(html);$('br').replaceWith('\n');$('p,h1,h2,h3,h4,li,div,section').append('\n');return $.text().replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
const sources=new Map();
for(const entry of log)sources.set(entry.path,load(await fs.readFile(path.join(root,'raw',entry.file),'utf8')));
for(const [p,$]of sources){
 $('.b-product-groups-gallery__image-link').each((_,el)=>{const dest=normalize($(el).attr('href')),img=$(el).find('img').first();if(img.attr('src'))galleryImages.set(dest,{url:img.attr('src'),alt:img.attr('alt')||''});});
}
const contact=sources.get('/contacts');
const company={
 name:one(contact('[data-qaid="company_name"]').first().text()),
 phones:[...new Set(contact('.b-contact-info__phone').toArray().map(el=>one(contact(el).text())))],
 email:contact('.b-contact-info a[href^="mailto:"]').first().attr('href').slice(7),
 address:one(contact('.b-contact-info [data-qaid="company_address"]').first().text()),
 contactName:one(contact('[data-qaid="contact_person_name"]').first().text()),
 whatsappPhone:'77004496383',whatsappUrl:'https://wa.me/77004496383',whatsappPosition:'left',
 mapUrl:contact('[data-qaid="google_map"]').attr('src'),
 locationDirections:one(contact('.b-user-content').first().text()),
 schedule:contact('.b-sked__row').toArray().map(el=>({day:one(contact(el).find('.b-sked__day').text()),hours:contact(el).find('.b-sked__time').toArray().map(t=>one(contact(t).text()))})),
};
const pages=[];
for(const entry of log){
 const p=entry.path,$=sources.get(p);
 const type=p==='/'?'home':p.startsWith('/g')?'category':p.startsWith('/p')&&p!=='/product_list'?'service':({'/about_us':'about','/contacts':'contacts','/product_list':'catalog','/testimonials':'reviews'}[p]||'policy');
 let title=one($('.b-page h1,.b-page__content h1').first().text())||company.name;
 if(title.endsWith('Описание позиции')){
  editorial.push({path:p,text:'Описание позиции',reason:'Editorial suffix in page title'});title=title.replace(/\s+Описание позиции$/,'');
 }
 const breadcrumbs=JSON.parse($('.b-breadcrumb').attr('data-crumbs-path')||'[]').map(x=>({label:x.name,path:x.url?normalize(x.url):p}));
 if(!breadcrumbs.length)breadcrumbs.push({label:'Главная',path:'/'});
 const parentPath=breadcrumbs.filter(x=>x.path!==p).at(-1)?.path;
 let raw='';
 if(type==='home'||type==='category'||type==='service'){
  raw=$('.b-user-content').toArray().map(el=>$(el).html()).join('\n');
  if(type==='service'&&$('[data-qaid="characteristics_block"]').length)raw+='<h2>Характеристики</h2>'+$.html($('[data-qaid="characteristics_block"]').first());
 }
 else if(type==='contacts'){
  raw=`<h2>Контактная информация</h2><p>${escape(company.name)}</p><p><strong>Контактное лицо:</strong> ${escape(company.contactName)}</p><p><strong>Адрес:</strong> ${escape(company.address)}</p><p>${company.phones.map(n=>`<a href="tel:${n.replace(/[^\d+]/g,'')}">${escape(n)}</a>`).join('<br>')}</p><p><a href="mailto:${company.email}">${company.email}</a></p><p><a href="${company.whatsappUrl}">WhatsApp: +${company.whatsappPhone}</a></p><h2>Как нас найти</h2><p>${escape(company.locationDirections)}</p><h2>График работы</h2><table><thead><tr><th>День</th><th>Время</th><th>Перерыв</th></tr></thead><tbody>${company.schedule.map(s=>`<tr><td>${s.day}</td><td>${s.hours.slice(0,2).join('–')}</td><td>${s.hours.slice(2).join('–')||'—'}</td></tr>`).join('')}</tbody></table>`;
 }else if(type==='reviews'){
  raw='<p>Пока нет опубликованных отзывов.</p>'+$('.b-commets').html();
 }else if(type!=='catalog')raw=$('.b-page__content').html()||'';
 let bodyHtml=cleanHtml(raw,p,{removeFirstH1:type!=='home'});
 const images=[];
 function addImage(img){if(img?.url&&!images.some(x=>x.url===img.url)){images.push(img);recordImage(img.url,img.alt,p);}}
 if(type==='service')$('.b-product__visual img').each((_,el)=>addImage({url:$(el).attr('src'),alt:$(el).attr('alt')||title}));
 if(type==='category')addImage(galleryImages.get(p));
 $('.b-user-content img').each((_,el)=>addImage({url:$(el).attr('src'),alt:$(el).attr('alt')||''}));
 if(type==='home'){
  const sliders=JSON.parse($('[data-slider-items]').attr('data-slider-items')||'[]');
  for(const slider of sliders)addImage({url:slider.imageSrc,alt:'Баннер КазПроф Лаб'});
 }
 // Preserve source backgrounds and icon assets in the archive, in addition to <img> elements.
 $('.b-user-content style').each((_,el)=>{
  for(const match of $(el).text().matchAll(/url\(\s*['"]?(https?:\/\/[^'")\s]+)['"]?\s*\)/g))recordImage(match[1],'Оригинальное фоновое изображение',p);
 });
 const sourceDescription=$('meta[name="description"]').attr('content')||'';
 if(/SAPA SPACE/i.test(sourceDescription)||/SAPA SPACE/i.test(bodyHtml))warnings.push({path:p,type:'legacy_brand',message:'Original source references SAPA SPACE; copied content requires owner review.',sourceDescription,bodyContainsLegacyBrand:/SAPA SPACE/i.test(bodyHtml)});
 const text=textOf(bodyHtml);
 const firstP=load(bodyHtml)('p').toArray().map(el=>one(load(bodyHtml)(el).text())).find(t=>t.length>70);
 const description=firstP||sourceDescription.replace(/SAPA SPACE/g,'КазПроф Лаб')||title;
 const childPaths=[...new Set($('.b-page__content .b-product-groups-gallery__title').toArray().map(el=>normalize($(el).attr('href'))))];
 const servicePaths=[...new Set($('.b-page__content .b-product-gallery__title').toArray().map(el=>normalize($(el).attr('href'))))];
 const page={path:p,type,title,description,bodyHtml,text,images,breadcrumbs,childrenPaths:childPaths,servicePaths,...(parentPath?{parentPath}:{}),sourceUrl:entry.url,sourceDescription};
 if(type==='service'){
  page.price=one($('.b-product .b-product-cost__price,.b-product .b-goods-price__value,.b-product [data-qaid="product_price"]').first().text())||one($('.b-order-info__item').first().text()).replace(/^Цена:\s*/,'');
  page.availability=one($('.b-product [data-qaid="presence_data"]').first().text());
 }
 if(type==='category'&&!text)warnings.push({path:p,type:'no_category_description',message:'The source category has no description; original category/service relationships are preserved.'});
 pages.push(page);
}
const pageMap=new Map(pages.map(p=>[p.path,p]));
// Resolve all descendants from every individual product breadcrumb, including products beyond page 1.
for(const p of pages.filter(x=>x.type==='category')){
 if(p.parentPath&&pageMap.has(p.parentPath)){
  const parent=pageMap.get(p.parentPath);
  if(!parent.childrenPaths.includes(p.path))parent.childrenPaths.push(p.path);
 }
}
for(const service of pages.filter(x=>x.type==='service')){
 for(const crumb of service.breadcrumbs){
  const parent=pageMap.get(crumb.path);
  if(parent&&['category','catalog'].includes(parent.type)&&!parent.servicePaths.includes(service.path))parent.servicePaths.push(service.path);
 }
}
const homepage=pageMap.get('/');
homepage.childrenPaths=pageMap.get('/product_list').childrenPaths;
homepage.servicePaths=pages.filter(x=>x.type==='service').map(x=>x.path);
const home=sources.get('/');
const logo=home('.b-header-company-name__img').attr('src');
company.logoUrl=logo;recordImage(logo,company.name,'/');
const navigation=home('.b-menu__holder > .js-menu-items > a').toArray().map(el=>({label:one(home(el).text()),path:normalize(home(el).attr('href'))}));
const data={pages,company,navigation,fetchedAt:new Date().toISOString()};
await fs.writeFile(path.join(root,'site-data.json'),JSON.stringify(data,null,2));
await fs.writeFile(path.join(root,'image-manifest.json'),JSON.stringify([...allImages.values()],null,2));
const missingLinks=[];
for(const page of pages){
 const $=load(page.bodyHtml);
 $('a[href^="/"]').each((_,el)=>{const href=$(el).attr('href').split(/[?#]/)[0];if(!known.has(href))missingLinks.push({path:page.path,href,label:$(el).text()});});
}
const audit={
 fetchedAt:data.fetchedAt,source:'https://kazproflab.kz/sitemap.xml',counts:Object.fromEntries([...new Set(pages.map(p=>p.type))].map(t=>[t,pages.filter(p=>p.type===t).length])),
 totalPages:pages.length,uniquePaths:new Set(pages.map(p=>p.path)).size,
 pages:pages.map(p=>({...log.find(e=>e.path===p.path),title:p.title,type:p.type,contentCharacters:p.text.length,bodyHtmlCharacters:p.bodyHtml.length,images:p.images.length,childCategories:p.childrenPaths.length,services:p.servicePaths.length,price:p.price||null})),
 removedEditorial:editorial,warnings,missingLinks,
 whatsapp:{source:'https://kazproflab.kz/graphql query socialPanelQuery (read only)',phone:company.whatsappPhone,position:company.whatsappPosition,hrefBase:company.whatsappUrl,originalTemplate:'Добрый день! Меня интересует предложение с Вашего сайта: <current page URL>'},
};
await fs.writeFile(path.join(root,'audit.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({counts:audit.counts,unique:audit.uniquePaths,images:allImages.size,removedEditorial:editorial.length,missingLinks},null,2));
