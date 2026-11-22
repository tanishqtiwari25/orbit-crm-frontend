import fs from 'node:fs';
import {createHash} from 'node:crypto';
let pages=0,scripts=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())walk(file);else if(file.endsWith('.html')){const html=fs.readFileSync(file,'utf8');if(!html.includes('http-equiv="Content-Security-Policy"'))throw Error('Missing CSP: '+file);for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=/i.test(m[1]))continue;const hash=createHash('sha256').update(m[2]).digest('base64');if(!html.includes(hash))throw Error('Missing script hash: '+file);scripts++;}pages++;}}}
walk('out');console.log({pages,scripts,valid:true});
