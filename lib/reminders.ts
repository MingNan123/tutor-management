
import type {State,Member} from './model';
import {teachingBalance} from './model';
import {can} from './permissions';
import {todayChina,classEnded,waitingHours} from './teaching';
import {followupTasks} from './trials';
export type Reminder={id:string;title:string;note:string;page:string;kind?:string;item?:any;urgent:boolean};
export function reminders(s:State,m:Member):Reminder[]{const rows:Reminder[]=[],today=todayChina(),name=(o:any)=>s.students.find(x=>x.id===o.studentId)?.name||'学员';
 for(const o of s.orders.filter(o=>o.status!=='void')){const b=teachingBalance(s,o),left=b.allowance-b.used-b.pending-b.scheduled,days=(Date.parse(o.expiry)-Date.parse(today))/86400000;
 if(['admin','sales'].includes(m.role)&&can(s,m,'orders.view')&&o.hours*o.price-o.paid>0)rows.push({id:'debt:'+o.id,title:name(o)+' · 待收款',note:'待收 ¥'+(o.hours*o.price-o.paid).toFixed(2),page:'finance',kind:'order',item:o,urgent:false});
 if(can(s,m,'schedule.view')&&left<10)rows.push({id:'hours:'+o.id,title:name(o)+' · 可授课额度不足 10 小时',note:'当前可新增 '+Math.max(0,left).toFixed(2)+' 小时',page:'schedule',kind:'order',item:o,urgent:left<=0});
 if(can(s,m,'schedule.view')&&days<=14)rows.push({id:'expiry:'+o.id,title:name(o)+(days<0?' · 订单已到期':' · 订单即将到期'),note:'有效期至 '+o.expiry,page:'schedule',kind:'order',item:o,urgent:days<0});}
 for(const l of s.lessons)if((l.status==='sales'&&m.role==='sales'&&can(s,m,'approvals.sales')&&s.orders.find(o=>o.id===l.orderId)?.salesId===m.id||l.status==='admin'&&m.role==='admin')&&waitingHours(l)>=48)rows.push({id:'approval:'+l.id,title:'消课审批超时',note:l.date+' · 已等待 '+Math.floor(waitingHours(l))+' 小时',page:'approvals',kind:'lesson',item:l,urgent:true});
 if(can(s,m,'schedule.view'))for(const x of s.schedules||[])if(x.status==='planned'&&classEnded(x.date,x.end)&&!s.lessons.some(l=>l.scheduleId===x.id&&l.status!=='rejected'))rows.push({id:'missing:'+x.id,title:'课程已结束，尚未有效提交消课',note:x.date+' '+x.start+'–'+x.end,page:'schedule',kind:'schedule',item:x,urgent:true});
 for(const t of s.trials||[])if(t.status==='confirmed'&&classEnded(t.date,t.end)&&(m.role==='admin'||m.role==='teacher'&&t.teacherId===m.id))rows.push({id:'trial:'+t.id,title:'试课已结束，待教学反馈',note:t.date+' · '+t.subject,page:'trials',kind:'trial',item:t,urgent:true});
 for(const f of followupTasks(s))if(f.date<=today)rows.push({id:'followup:'+f.id,title:f.date<today?'客户跟进已逾期':'客户跟进今日到期',note:f.date+' · '+f.text,page:'followups',urgent:f.date<today});
 return rows.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.id.localeCompare(b.id));}
