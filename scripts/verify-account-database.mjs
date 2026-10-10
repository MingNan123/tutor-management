import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');const dir=await mkdtemp(join(tmpdir(),'zhixing-cloud-accounts-'));
const db={
  prepare(query){
    const statement={bind(...args){
      return {
        async first(){return sql.prepare(query).get(...args)||null;},
        async all(){return {results:sql.prepare(query).all(...args)};},
        async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}
      };
    }};
    Object.assign(statement,statement.bind());return statement;
  },
  async batch(statements){sql.exec('BEGIN');try{const out=[];for(const statement of statements)out.push(await statement.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}
};
globalThis.__accountTestEnv={DB:db};
try{for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()){sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));}
await writeFile(join(dir,'permissions.mjs'),ts.transpileModule(await readFile(new URL('../lib/permissions.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
let source=await readFile(new URL('../lib/accounts.ts',import.meta.url),'utf8');source=source.replace("'./permissions'","'./permissions.mjs'");source=source.replace("import {env} from 'cloudflare:workers';","const env=globalThis.__accountTestEnv;");await writeFile(join(dir,'accounts.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);const {hydrateAccounts,authorizeAccount,accountWriteStatement}=await import(pathToFileURL(join(dir,'accounts.mjs')));
const state={members:[{id:'admin',name:'管理员',email:'owner@example.com',role:'admin'},{id:'teacher',name:'老师',email:'teacher@example.com',role:'teacher'},{id:'demo',name:'示例',email:'',role:'sales'}]};sql.prepare('INSERT INTO workspaces (id,data,version) VALUES (?,?,?)').run('enterprise',JSON.stringify(state),0);
await hydrateAccounts(state);assert.equal(state.members.length,3);assert.ok(state.members.every(x=>x.status==='active'&&x.createdAt));assert.equal((await authorizeAccount({userId:'u1',email:'OWNER@EXAMPLE.COM'})).id,'admin');assert.equal((await authorizeAccount({userId:'u1',email:'owner@example.com'})).id,'admin');await assert.rejects(()=>authorizeAccount({userId:'imposter',email:'owner@example.com'}),/绑定其他/);await assert.rejects(()=>authorizeAccount({userId:'outsider',email:'none@example.com'}),/未加入/);
const teacher=state.members.find(x=>x.id==='teacher');await authorizeAccount({userId:'t1',email:'teacher@example.com'});teacher.status='disabled';teacher.updatedAt=new Date().toISOString();let serialized=JSON.stringify(state);await db.batch([db.prepare('UPDATE workspaces SET data=?,version=version+1 WHERE id=? AND version=?').bind(serialized,'enterprise',0),accountWriteStatement(teacher,serialized,1)]);await assert.rejects(()=>authorizeAccount({userId:'t1',email:'teacher@example.com'}),/停用/);
// 迁移只运行一次，旧企业快照不能重新激活停用账号。
await hydrateAccounts({members:[{id:'teacher',name:'旧姓名',email:'teacher@example.com',role:'teacher'}]});assert.equal(sql.prepare('SELECT status FROM enterprise_accounts WHERE id=?').get('teacher').status,'disabled');
// 乐观锁冲突时，账号表也不能被写入。
const active={...teacher,status:'active'};const stale=JSON.stringify({members:[active]});const results=await db.batch([db.prepare('UPDATE workspaces SET data=?,version=version+1 WHERE id=? AND version=?').bind(stale,'enterprise',0),accountWriteStatement(active,stale,1)]);assert.equal(results[0].meta.changes,0);assert.equal(results[1].meta.changes,0);assert.equal(sql.prepare('SELECT status FROM enterprise_accounts WHERE id=?').get('teacher').status,'disabled');
// 修改邮箱会解绑旧登录身份，旧邮箱不可再进入。
const changed={...teacher,email:'new-teacher@example.com',status:'active'};serialized=JSON.stringify({members:[changed]});await db.batch([db.prepare('UPDATE workspaces SET data=?,version=version+1 WHERE id=? AND version=?').bind(serialized,'enterprise',1),accountWriteStatement(changed,serialized,2)]);await assert.rejects(()=>authorizeAccount({userId:'t1',email:'teacher@example.com'}),/未加入/);assert.equal((await authorizeAccount({userId:'t2',email:'new-teacher@example.com'})).id,'teacher');
assert.throws(()=>sql.prepare('INSERT INTO enterprise_accounts (id,name,email,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run('duplicate','重复','owner@example.com','sales','active','now','now'),/UNIQUE/);
console.log('通过：SQL迁移、旧账号一次性迁移、云端登录身份绑定、停用拒绝登录、跨请求持久化、并发冲突不覆盖账号、邮箱变更解绑、数据库唯一约束');
}finally{sql.close();delete globalThis.__accountTestEnv;await rm(dir,{recursive:true,force:true});}
