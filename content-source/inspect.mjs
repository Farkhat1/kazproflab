import fs from 'node:fs/promises';
import {load} from 'cheerio';
const log=JSON.parse(await fs.readFile('content-source/fetch-log.json'));
for(const item of log){
 const $=load(await fs.readFile('content-source/raw/'+item.file,'utf8'));
 console.log(JSON.stringify({
 path:item.path,title:$('.b-page h1,.b-page__content h1').first().text(),
 content:$('.b-user-content').toArray().map(el=>({parent:$(el).parent().attr('class'),length:$(el).text().trim().length,start:$(el).text().trim().slice(0,150),images:$(el).find('img').length})),
 crumbs:$('.b-breadcrumb').attr('data-crumbs-items'),
 classes:$('.b-page__content').children().toArray().map(el=>$(el).attr('class'))
 }));
}
