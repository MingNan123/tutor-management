import {cp,rm,readdir,readFile,writeFile} from 'node:fs/promises';
await cp('cloudflare/standalone.mjs','dist/server/standalone.mjs');
await cp('cloudflare/maintenance.mjs','dist/server/maintenance.mjs');
await rm('dist/.openai',{recursive:true,force:true});
await rm('dist/server/wrangler.json',{force:true});
async function patch(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await patch(path);else if(path.endsWith('.css'))await writeFile(path,(await readFile(path,'utf8'))+'\n.setupentry{display:none!important}\n');else if(path.endsWith('.js'))await writeFile(path,(await readFile(path,'utf8')).replaceAll('暂不分组 · 登录后可创建小组','暂不分组 · 由管理员分组'));}}
await patch('dist');
console.log('Cloudflare build prepared.');
