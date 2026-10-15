import type {State,Member} from './model';
import {can} from './permissions';
import {todayChina} from './teaching';
export function performanceView(s:State,m:Member,from:string,to:string){
 if(!can(s,m,'orders.view')||!can(s,m,'groups.view')||!['sales','admin'].includes(m.role))throw Error('当前账号无权查看业绩');
 const groups=s.groups||[],leader=groups.find(g=>g.leaderId===m.id);
 const visible=(salesId:string,groupId:string)=>m.role==='admin'||salesId===m.id||!!leader&&groupId===leader.id;
 const receipts=(s.payments||[]).filter(x=>x.kind!=='opening'&&x.date>=from&&x.date<=to&&visible(x.salesId,x.groupId));
 const opening=(s.payments||[]).filter(x=>x.kind==='opening'&&visible(x.salesId,x.groupId)).reduce((n,x)=>n+x.amount,0);
 const trials=(s.trials||[]).filter(t=>t.status==='completed'&&t.date>=from&&t.date<=to&&visible(t.attribution?.salesId||t.salesId,t.attribution?.groupId??'legacy'));
 const followups=(s.followups||[]).filter(f=>f.nextDate&&f.nextDate>=from&&f.nextDate<=to&&f.nextDate<=todayChina()&&visible(f.attribution?.salesId||f.salesId,f.attribution?.groupId??'legacy'));
 type Row={id:string;name:string;receipts:number;refunds:number;net:number;newNet:number;renewalNet:number;legacyNet:number;trials:number;converted:number;due:number;onTime:number;members:Set<string>};
 const people=new Map<string,Row>(),teams=new Map<string,Row>();
 function row(map:Map<string,Row>,id:string,name:string){if(!map.has(id))map.set(id,{id,name,receipts:0,refunds:0,net:0,newNet:0,renewalNet:0,legacyNet:0,trials:0,converted:0,due:0,onTime:0,members:new Set()});return map.get(id)!;}
 function targets(salesId:string,salesName:string,groupId:string,groupName:string){return [row(people,salesId,salesName),row(teams,groupId||'ungrouped',groupName||'未分组')];}
 for(const p of receipts)for(const r of targets(p.salesId,p.salesName,p.groupId,p.groupName)){r.members.add(p.salesId);r[p.kind==='receipt'?'receipts':'refunds']+=Math.round(p.amount*100);const signed=(p.kind==='receipt'?1:-1)*Math.round(p.amount*100);r.net+=signed;r[p.orderType==='renewal'?'renewalNet':p.orderType==='new'?'newNet':'legacyNet']+=signed;}
 for(const t of trials)for(const r of targets(t.attribution?.salesId||t.salesId,t.attribution?.salesName||s.members.find(m=>m.id===t.salesId)?.name||'原顾问',t.attribution?.groupId??'legacy',t.attribution?.groupName||'历史归属待核实')){r.members.add(t.attribution?.salesId||t.salesId);r.trials++;if(t.orderId&&s.orders.some(o=>o.id===t.orderId&&o.status!=='void'))r.converted++;}
 for(const f of followups)for(const r of targets(f.attribution?.salesId||f.salesId,f.attribution?.salesName||s.members.find(m=>m.id===f.salesId)?.name||'原顾问',f.attribution?.groupId??'legacy',f.attribution?.groupName||'历史归属待核实')){r.members.add(f.attribution?.salesId||f.salesId);r.due++;if(f.completedAt&&Date.parse(f.completedAt)<=Date.parse(f.nextDate+'T23:59:59.999+08:00'))r.onTime++;}
 // Current active staff with no activity still appear; historical attribution is taken only from saved events.
 for(const x of s.members.filter(x=>x.role==='sales'&&x.status==='active'&&visible(x.id,x.groupId||''))){row(people,x.id,x.name);const g=groups.find(g=>g.id===x.groupId);row(teams,g?.id||'ungrouped',g?.name||'未分组').members.add(x.id);}
 const finish=(map:Map<string,Row>)=>[...map.values()].sort((a,b)=>b.net-a.net||a.name.localeCompare(b.name)).map(r=>({...r,receipts:r.receipts/100,refunds:r.refunds/100,net:r.net/100,newNet:r.newNet/100,renewalNet:r.renewalNet/100,legacyNet:r.legacyNet/100,members:r.members.size,perCapita:r.members.size?r.net/100/r.members.size:0,conversion:r.trials>=5?r.converted/r.trials:null,timeliness:r.due?r.onTime/r.due:null}));
 return {from,to,asOf:new Date().toISOString(),scope:m.role==='admin'?'全机构':leader?'本人及本组':'本人',people:finish(people),groups:finish(teams),receipts,trialDetails:trials.map(t=>({id:t.id,date:t.date,salesId:t.attribution?.salesId||t.salesId,groupId:t.attribution?.groupId??'legacy',converted:!!t.orderId&&s.orders.some(o=>o.id===t.orderId&&o.status!=='void')})),followupDetails:followups.map(f=>({id:f.id,date:f.nextDate,salesId:f.attribution?.salesId||f.salesId,groupId:f.attribution?.groupId??'legacy',completedAt:f.completedAt||''})),opening};
}
