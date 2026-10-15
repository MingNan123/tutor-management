import type {State,Member,Order} from './model';
import {used,pending,scheduled,teachingAllowance} from './model';
import {can,inScope} from './permissions';
import {todayChina,validDate} from './teaching';

export type Payment={id:string;orderId:string;kind:'receipt'|'refund'|'opening';amount:number;date:string;method:string;reference:string;reason:string;actorId:string;actorName:string;salesId:string;salesName:string;groupId:string;groupName:string;orderType:'new'|'renewal'|'legacy';created:string;reversalOf?:string};
export const cents=(n:number)=>Math.round(n*100);
export function attribution(s:State,salesId:string){const m=s.members.find(m=>m.id===salesId),g=s.groups?.find(g=>g.id===m?.groupId);return {salesId,salesName:m?.name||'原顾问',groupId:g?.id||'',groupName:g?.name||'未分组'};}
export function appendInitialReceipt(s:State,o:Order,actor:Member){if(o.paid<=0)return;s.payments ||= [];s.payments.unshift({id:'initial:'+o.id,orderId:o.id,kind:'receipt',amount:o.paid,date:o.date,method:'订单首款',reference:o.screenshotId||'',reason:'录单首款，凭证见订单截图',actorId:actor.id,actorName:actor.name,...(o.attribution||attribution(s,o.salesId)),orderType:o.orderType||'legacy',created:new Date().toISOString()});}
export function applyFinance(s:State,m:Member,op:string,p:any){
 if(!['payment','paymentReverse','orderVoid'].includes(op))return false;
 const need=(ok:unknown,msg:string)=>{if(!ok)throw Error(msg)},now=new Date().toISOString();s.payments ||= [];
 const original=op==='paymentReverse'?s.payments.find(x=>x.id===p.paymentId):undefined;
 const o=s.orders.find(o=>o.id===(original?.orderId||p.orderId));need(o,'订单不存在');
 need(can(s,m,'orders.view')&&(m.role==='admin'||m.role==='sales'&&can(s,m,'orders.create')&&inScope(s,m,'orders',o!.salesId)),'当前账号无权处理此订单收款');
 const reason=String(p.reason||'').trim();need(reason&&reason.length<=1000,'请填写不超过 1000 字的操作原因');
 if(op==='orderVoid'){
  need(m.role==='admin','仅管理员可作废订单');need(o!.status!=='void','订单已作废');need(cents(o!.paid)===0&&used(s,o!.id)+pending(s,o!.id)===0,'请先退清款项并处理所有消课审批，再作废订单');
  for(const x of s.schedules||[])if(x.orderId===o!.id&&x.status==='planned'){x.status='leave';x.leaveReason='订单作废：'+reason;x.history.push({date:now,actor:m.name,action:'订单作废取消排课',note:reason});}
  o!.status='void';o!.voidReason=reason;o!.voidAt=now;for(const t of s.trials||[])if(t.orderId===o!.id){t.orderId=undefined;t.outcome='pending';t.updatedAt=now;t.history.push({date:now,actor:m.name,action:'关联订单作废',note:o!.id+'；'+reason});}
 }else{
  need(o!.status!=='void','作废订单不能收退款');
  const id=String(p.requestId||'');need(/^[a-zA-Z0-9_-]{8,80}$/.test(id),'请求编号无效，请重新打开表单');const eventId='txn:'+m.id+':'+id;
  let kind=p.kind,amount=Number(p.amount),date=String(p.date||''),method=String(p.method||'').trim(),reference=String(p.reference||'').trim();
  if(op==='paymentReverse'){need(m.role==='admin'&&original&&original.kind!=='opening','仅管理员可冲正收退款流水');need(!original!.reversalOf&&!s.payments.some(x=>x.reversalOf===original!.id&&x.id!==eventId),'该流水已冲正或属于冲正记录');kind=original!.kind==='receipt'?'refund':'receipt';amount=original!.amount;date=todayChina();method='冲正';reference=original!.id;}
  need(kind==='receipt'||kind==='refund','收退款类型不正确');need(kind!=='refund'||m.role==='admin','退款仅管理员可处理');
  need(Number.isFinite(amount)&&amount>0&&Number.isSafeInteger(cents(amount))&&Math.abs(amount-cents(amount)/100)<1e-8,'金额需为正数且最多两位小数');need(validDate(date)&&date<=todayChina()&&date>=o!.date,'流水日期需在订单日期与今天之间');
  need(method&&method.length<=80&&reference&&reference.length<=200,'请填写收退款方式和凭证编号或内部凭证地址');
  const existing=s.payments.find(x=>x.id===eventId);if(existing){need(existing.orderId===o!.id&&existing.kind===kind&&existing.amount===amount&&existing.date===date&&existing.reason===reason&&existing.reference===reference&&existing.method===method&&existing.reversalOf===original?.id,'该请求编号已用于不同操作');return true;}
  const paid=(cents(o!.paid)+(kind==='receipt'?1:-1)*cents(amount))/100;need(paid>=0&&cents(paid)<=cents(o!.hours*o!.price),'累计净收款不能为负或超过合同金额');
  const projected:State=structuredClone(s);const next=projected.orders.find(x=>x.id===o!.id)!;next.paid=paid;
  if(kind==='refund'&&p.releaseSchedules===true)for(const x of projected.schedules||[])if(x.orderId===o!.id&&x.status==='planned'&&!projected.lessons.some(l=>l.scheduleId===x.id&&l.status!=='rejected')){x.status='leave';x.leaveReason='退款取消排课：'+reason;x.history.push({date:now,actor:m.name,action:'退款取消排课',note:reason});}
  need(used(projected,o!.id)+pending(projected,o!.id)+scheduled(projected,o!.id)<=teachingAllowance(next),'退款后课时不足以覆盖已消、待审批及已排课时；请先处理排课或由管理员明确批准欠款额度');
  o!.paid=paid;s.schedules=projected.schedules;
  s.payments.unshift({id:eventId,orderId:o!.id,kind,amount,date,method,reference,reason,actorId:m.id,actorName:m.name,...(original?{salesId:original.salesId,salesName:original.salesName,groupId:original.groupId,groupName:original.groupName}:o!.attribution||attribution(s,o!.salesId)),orderType:original?.orderType||o!.orderType||'legacy',created:now,...(original?{reversalOf:original.id}:{})});
 }
 s.logs.unshift({id:crypto.randomUUID(),date:now,actor:m.name,action:({payment:'登记收退款',paymentReverse:'冲正收退款',orderVoid:'作废订单'} as Record<string,string>)[op]+' · '+o!.id+' · '+reason});return true;
}
