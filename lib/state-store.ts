import {env} from 'cloudflare:workers';
import {hydrateAccounts,accountWriteStatement,groupWriteStatement} from './accounts';
import {defaultPositions} from './permissions';
import type {State,Member} from './model';
export const collections=['students','orders','schedules','lessons','trials','followups','positions'] as const;
export type Revisions=Record<string,number|string>;
export async function loadState(){
 const results=await env.DB!.batch([env.DB!.prepare("SELECT data,version FROM workspaces WHERE id='enterprise'"),...collections.map(n=>env.DB!.prepare('SELECT id,data,revision FROM business_'+n)),env.DB!.prepare('SELECT id,date,actor,action FROM audit_events ORDER BY date DESC,id DESC LIMIT 500')]);
 const row:any=results[0].results[0];if(!row)throw Error('机构尚未初始化');const state:State=JSON.parse(row.data),revisions:Revisions={'company':row.version};
 collections.forEach((n,i)=>{(state as any)[n]=results[i+1].results.map((x:any)=>{revisions[n+':'+x.id]=x.revision;return JSON.parse(x.data);});});
 state.positions=[...defaultPositions().filter(p=>!state.positions?.some(x=>x.id===p.id)),...(state.positions||[])];state.logs=results.at(-1)!.results as any;
 await hydrateAccounts(state);state.members.forEach(x=>revisions['members:'+x.id]=x.updatedAt||'');state.groups?.forEach(x=>revisions['groups:'+x.id]=x.updatedAt);
 return {state,version:row.version,revisions};
}
export function auditStatement(actor:Member,action:string,target='',details?:unknown){return env.DB!.prepare('INSERT INTO audit_events(id,date,actor,actor_id,action,target_id,details) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),actor.name,actor.id,action,target,details?JSON.stringify(details):null);}
export async function commitState(before:State,after:State,version:number,current:Revisions,client:Revisions,actor:Member,secret?:{id:string;hash:string;salt:string}){
 const metadata={owner:after.owner,company:after.company};const serialized=JSON.stringify(metadata);const writes:any[]=[];
 const changed=(a:any,b:any)=>JSON.stringify(a)!==JSON.stringify(b);
 function check(key:string){if((client[key]??0)!==(current[key]??0))throw Error('该记录已被其他人员修改，请刷新后重试');}
 for(const n of collections){const old=(before as any)[n]||[];for(const x of (after as any)[n]||[]){const previous=old.find((v:any)=>v.id===x.id);if(!changed(previous,x))continue;check(n+':'+x.id);writes.push(env.DB!.prepare(`INSERT INTO business_${n}(id,data,revision) SELECT ?,?,1 WHERE EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND version=? AND data=?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=business_${n}.revision+1`).bind(x.id,JSON.stringify(x),version+1,serialized));}}
 if(before.company!==after.company)check('company');
 for(const x of after.members){const old=before.members.find(v=>v.id===x.id);if(!changed(old,x))continue;check('members:'+x.id);writes.push(accountWriteStatement(x,serialized,version+1));if(x.status!=='active'||old?.role!==x.role||old?.positionId!==x.positionId)writes.push(env.DB!.prepare("DELETE FROM login_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND version=? AND data=?)").bind(x.id,version+1,serialized));}
 for(const x of after.groups||[]){if(!changed(before.groups?.find(v=>v.id===x.id),x))continue;check('groups:'+x.id);writes.push(groupWriteStatement(x,serialized,version+1));}
 const oldLogs=new Set(before.logs.map(l=>l.id));for(const log of after.logs.filter(l=>!oldLogs.has(l.id)))writes.push(env.DB!.prepare("INSERT INTO audit_events(id,date,actor,actor_id,action) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND version=? AND data=?)").bind(log.id,log.date,log.actor,actor.id,log.action,version+1,serialized));
 for(const order of after.orders)if(order.screenshotId&&!before.orders.some(o=>o.screenshotId===order.screenshotId))writes.push(env.DB!.prepare("UPDATE order_screenshots SET order_id=? WHERE id=? AND EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND version=? AND data=?)").bind(order.id,order.screenshotId,version+1,serialized));
 if(secret)writes.push(env.DB!.prepare("UPDATE enterprise_accounts SET password_hash=?,password_salt=? WHERE id=? AND EXISTS(SELECT 1 FROM workspaces WHERE id='enterprise' AND version=? AND data=?)").bind(secret.hash,secret.salt,secret.id,version+1,serialized));
 const result=await env.DB!.batch([env.DB!.prepare("UPDATE workspaces SET data=?,version=version+1 WHERE id='enterprise' AND version=?").bind(serialized,version),...writes]);return !!result[0].meta.changes;
}
