import fs from 'node:fs/promises';
import {load} from 'cheerio';
for(const name of ['about_us','delivery_info','return_policy','testimonials','product_list','g9714386-podgotovka-otsenke-akkreditatsii']){
 const $=load(await fs.readFile(`content-source/raw/${name}.html`,'utf8'));
 const c=$('.b-page__content');
 c.find('style,script,.b-online-edit__link,.b-online-edit__vertical-borders,.b-online-edit__horizontal-borders,[data-bazooka="LazyDiv"],.b-catalog-panel').remove();
 c.find('*').each((i,el)=>{for(const a of Object.keys(el.attribs))if(a!=='class'&&a!=='href'&&a!=='src'&&a!=='alt')$(el).removeAttr(a)});
 console.log('\n---'+name+'---\n'+c.html());
}
