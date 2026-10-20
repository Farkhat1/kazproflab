import fs from 'node:fs/promises';
const data=JSON.parse(await fs.readFile('content-source/site-data.json','utf8'));
const audit=JSON.parse(await fs.readFile('content-source/audit.json','utf8'));
const changes=[];
const reviews=data.pages.find(x=>x.path==='/testimonials');
const old='На момент переноса на сайте не опубликовано отзывов о компании.';
if(reviews.bodyHtml.includes(old)){
 reviews.bodyHtml=reviews.bodyHtml.replace(old,'Пока нет опубликованных отзывов.');
 reviews.text=reviews.text.replace(old,'Пока нет опубликованных отзывов.');
 reviews.description='Пока нет опубликованных отзывов.';
 changes.push({path:reviews.path,from:old,to:'Пока нет опубликованных отзывов.',reason:'Remove implementation wording from public empty state.'});
}
const delivery=data.pages.find(x=>x.path==='/delivery_info');
if(delivery.bodyHtml.includes('Безналичный расчетОплата')){
 delivery.bodyHtml=delivery.bodyHtml.replace('Безналичный расчетОплата','Безналичный расчет. Оплата');
 delivery.text=delivery.text.replace('Безналичный расчетОплата','Безналичный расчет. Оплата');
 changes.push({path:delivery.path,from:'Безналичный расчетОплата',to:'Безналичный расчет. Оплата',reason:'Restore boundary between payment label and comment after source span removal.'});
}
for(const page of data.pages){
 const stale=(page.bodyHtml.match(/href="\/#bot"/g)||[]).length;
 if(stale){
  page.bodyHtml=page.bodyHtml.replaceAll('href="/#bot"','href="/product_list"');
  changes.push({path:page.path,from:'/#bot',to:'/product_list',count:stale,reason:'The source buttons say «Посмотреть каталог» / «Перейти в каталог»; point to the migrated catalog instead of a missing anchor.'});
 }
 const item=audit.pages.find(x=>x.path===page.path);
 item.contentCharacters=page.text.length;item.bodyHtmlCharacters=page.bodyHtml.length;
}
audit.migrationAdjustments=[...(audit.migrationAdjustments||[]),...changes];
await fs.writeFile('content-source/site-data.json',JSON.stringify(data,null,2));
await fs.writeFile('content-source/audit.json',JSON.stringify(audit,null,2));
console.log(changes);
