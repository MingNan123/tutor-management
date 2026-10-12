import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const db=new DatabaseSync(':memory:');
try{
 const files=(await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();for(const name of files.filter(x=>!x.startsWith('0006')))db.exec(await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const original={owner:'old-owner',company:'原机构',members:[],groups:[],positions:[{id:'pos_fulltime',builtin:true,policy:{grants:{'orders.view':true}}}],students:[{id:'old-student',name:'原学员'}],orders:[{id:'old-order',screenshotId:'old-image',teacherId:'old-teacher'}],lessons:[{id:'old-lesson',teacherId:'old-teacher',status:'approved'}],schedules:[{id:'old-plan'}],trials:[{id:'old-trial'}],followups:[{id:'old-followup'}],logs:[{id:'old-log',date:'2026-01-01',actor:'原管理员',action:'旧日志'}]};
 db.prepare('INSERT INTO workspaces(id,data,version) VALUES(?,?,?)').run('enterprise',JSON.stringify(original),7);db.prepare('INSERT INTO order_screenshots(id,object_key,uploader,name,mime,created) VALUES(?,?,?,?,?,?)').run('old-image','order-screenshots/old-image','old-sales','old.png','image/png','2026-01-01');
 db.exec(await readFile(new URL('../drizzle/'+files.find(x=>x.startsWith('0006')),import.meta.url),'utf8'));
 for(const name of ['students','orders','lessons','schedules','trials','followups'])assert.deepEqual(JSON.parse(db.prepare('SELECT data FROM business_'+name).get().data),original[name][0]);
 const meta=JSON.parse(db.prepare('SELECT data FROM workspaces').get().data);assert.equal(meta.company,original.company);assert.equal(meta.owner,original.owner);assert(!meta.orders);assert.equal(db.prepare('SELECT version FROM workspaces').get().version,7);assert.equal(db.prepare('SELECT order_id FROM order_screenshots').get().order_id,'old-order');assert.equal(db.prepare('SELECT action FROM audit_events').get().action,'旧日志');assert.equal(JSON.parse(db.prepare('SELECT data FROM business_positions').get().data).policy.grants['orders.view'],false);
 console.log('PASS: legacy business records, history, institution, version and screenshot mappings preserved; default teacher financial permission removed');
}finally{db.close();}
