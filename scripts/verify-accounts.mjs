import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'zhixing-accounts-'));
try{for(const name of ['teaching','permissions','trials','model']){let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');source=source.replace(/'\.\/(teaching|trials|permissions|model)'/g,"'./$1.mjs'");await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}const {seed,apply}=await import(pathToFileURL(join(dir,'model.mjs')));const s=seed('owner','owner@example.com');const [admin,sales,,teacher]=s.members;
assert.throws(()=>apply(s,sales,'member',{name:'员工',role:'teacher',email:'one@example.com'}));
apply(s,admin,'member',{name:'新老师',role:'teacher',email:' NEW@EXAMPLE.COM ',status:'active'});const added=s.members.at(-1);assert.equal(added.email,'new@example.com');assert.ok(added.createdAt&&added.updatedAt);
assert.throws(()=>apply(s,admin,'member',{name:'重复',role:'sales',email:'NEW@example.com'}),/已绑定/);
apply(s,admin,'memberUpdate',{...added,name:'陈老师二',email:'other@example.com',status:'disabled'});assert.equal(added.status,'disabled');assert.equal(added.email,'other@example.com');assert.equal(added.name,'陈老师二');
assert.throws(()=>apply(s,admin,'order',{screenshotId:'x',studentId:'s1',teacherId:added.id,subject:'数学',hours:10,price:100,paid:0,date:'2026-10-10',expiry:'2027-01-01'}));
apply(s,admin,'memberUpdate',{...added,status:'active'});assert.equal(added.status,'active');
assert.throws(()=>apply(s,admin,'memberUpdate',{...admin,status:'disabled'}),/本人/);assert.throws(()=>apply(s,admin,'memberUpdate',{...admin,email:'another@example.com'}),/本人/);apply(s,admin,'memberUpdate',{...teacher,role:'sales',positionId:'pos_sales'});assert.equal(teacher.role,'sales');apply(s,admin,'memberUpdate',{...teacher,role:'teacher',positionId:'pos_fulltime',employment:'fulltime'});
const orders=JSON.stringify(s.orders),lessons=JSON.stringify(s.lessons);apply(s,admin,'memberUpdate',{...sales,status:'disabled'});assert.equal(JSON.stringify(s.orders),orders);assert.equal(JSON.stringify(s.lessons),lessons);
console.log('通过：账号创建与编辑、邮箱规范化与去重、角色权限、停用与启用、禁止分配停用账号、自身账号保护、历史记录保留');}finally{await rm(dir,{recursive:true,force:true});}
