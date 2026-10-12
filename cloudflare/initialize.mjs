import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {stdin,stdout} from 'node:process';
import {randomBytes,pbkdf2Sync,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
export function makeInitialization({company,name,email,username,password}) {
  if(!company||!name||!/^\S+@\S+\.\S+$/.test(email))throw Error('机构名称、管理员姓名、有效邮箱为必填项');
  if(!/^[a-z0-9_]{4,32}$/.test(username))throw Error('账号为 4–32 位字母、数字或下划线');
  if(password.length<8||password.length>128)throw Error('密码为 8–128 个字符');
  const id=randomUUID(),salt=randomBytes(32).toString('hex'),stamp=new Date().toISOString();
  const hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
  const member={id,name,email,username,role:'admin',adminLevel:1,status:'active',employment:'fulltime',positionId:'pos_admin',hasPassword:true,createdAt:stamp,updatedAt:stamp};
  const state={owner:'standalone-'+randomUUID(),company};
  const q=x=>"'"+String(x).replaceAll("'","''")+"'";
  // A populated workspace blocks all writes. No production data or passwords are overwritten.
  const sql=`INSERT INTO workspaces (id,data,version) SELECT 'enterprise',${q(JSON.stringify(state))},0 WHERE NOT EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise');
INSERT INTO enterprise_accounts (id,name,email,username,password_hash,password_salt,role,status,employment,admin_level,position_id,created_at,updated_at) SELECT ${[id,name,email,username,hash,salt,'admin','active','fulltime',1,'pos_admin',stamp,stamp].map(q).join(',')} WHERE EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND data=${q(JSON.stringify(state))});
INSERT OR IGNORE INTO account_initializations (id,created_at) SELECT 'enterprise',${q(stamp)} WHERE EXISTS(SELECT 1 FROM enterprise_accounts WHERE id=${q(id)});
INSERT INTO audit_events(id,date,actor,actor_id,action) SELECT ${q(randomUUID())},${q(stamp)},${q(name)},${q(id)},'机构初始化' WHERE EXISTS(SELECT 1 FROM enterprise_accounts WHERE id=${q(id)});
INSERT OR IGNORE INTO account_initializations (id,created_at) SELECT 'staff-policy-v1',${q(stamp)} WHERE EXISTS(SELECT 1 FROM enterprise_accounts WHERE id=${q(id)});`;
  return {sql,id};
}
async function main(){
  if(!stdin.isTTY)throw Error('请在本地交互终端中运行，密码不会显示或写入配置。');
  const c=JSON.parse(await readFile('wrangler.json','utf8'));
  if(c.d1_databases[0].database_id==='REPLACE_DATABASE_ID')throw Error('请先运行 npm run configure');
  let muted=false;
  const output=new Writable({write(chunk,encoding,callback){if(!muted)stdout.write(chunk,encoding);callback();}});
  const rl=createInterface({input:stdin,output,terminal:true});let dir;
  try {
    const company=(await rl.question('机构名称：')).trim();
    const name=(await rl.question('管理员姓名：')).trim();
    const email=(await rl.question('管理员邮箱：')).trim().toLowerCase();
    const username=(await rl.question('管理员登录账号：')).trim().toLowerCase();
    stdout.write('管理员密码（输入不显示）：');muted=true;
    const password=await rl.question('');muted=false;stdout.write('\n');
    stdout.write('再次输入密码：');muted=true;
    const confirm=await rl.question('');muted=false;stdout.write('\n');
    if(password!==confirm)throw Error('两次密码不一致');
    const {sql,id}=makeInitialization({company,name,email,username,password});
    dir=await mkdtemp(join(tmpdir(),'tutor-init-'));
    const file=join(dir,'initialize.sql');await writeFile(file,sql,{mode:0o600});
    const cli=join(process.cwd(),'../node_modules/wrangler/bin/wrangler.js');
    let r=spawnSync(process.execPath,[cli,'d1','execute','DB','--remote','--config','wrangler.json','--file',file],{encoding:'utf8'});
    if(r.status!==0)throw Error('初始化命令失败，请检查 Cloudflare 登录、数据库 ID 和迁移状态。');
    r=spawnSync(process.execPath,[cli,'d1','execute','DB','--remote','--config','wrangler.json','--command',`SELECT id FROM enterprise_accounts WHERE id='${id}'`,'--json'],{encoding:'utf8'});
    if(r.status!==0||!r.stdout.includes(id))throw Error('没有创建新账号：数据库可能已经初始化。请使用原管理员登录，不要覆盖数据。');
    console.log('初始化成功。请使用刚设置的账号密码登录。');
  } finally {muted=false;rl.close();if(dir)await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith('/initialize.mjs')&&!process.env.TUTOR_INIT_TEST)main().catch(e=>{console.error(e.message);process.exitCode=1;});
