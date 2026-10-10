import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'zhixing-teaching-'));
try{
for(const name of ['teaching','permissions','trials','model']){let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');source=source.replace(/'\.\/(teaching|trials|permissions)'/g,"'./$1.mjs'");await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
const {seed,apply,used,pending,scheduled,scheduleStatus}=await import(pathToFileURL(join(dir,'model.mjs')));
const {todayChina,waitingHours,weekDates}=await import(pathToFileURL(join(dir,'teaching.mjs')));
const s=seed('owner','test@example.com');s.lessons=[];s.orders.forEach(o=>{o.date='2026-01-01';o.expiry='2027-12-31'});const [admin,sales,other,teacher,teacher2]=s.members;teacher.employment='fulltime';teacher2.employment='fulltime';const today=todayChina();const slot={orderId:s.orders[0].id,date:today,start:'09:00',end:'11:00',location:'A教室',note:'基础巩固'};
assert.throws(()=>apply(s,teacher,'schedule',slot));assert.throws(()=>apply(s,other,'schedule',slot));
apply(s,sales,'schedule',slot);const plan=s.schedules[0];assert.equal(scheduled(s,slot.orderId),2);
assert.throws(()=>apply(s,sales,'schedule',{...slot,orderId:s.orders[2].id,start:'10:00',end:'12:00'}),/冲突/);
// 同一学员跨老师、跨订单也不能重叠。
s.orders.push({...s.orders[0],id:'other-teacher',teacherId:'teacher2'});
assert.throws(()=>apply(s,sales,'schedule',{...slot,orderId:'other-teacher',start:'10:00',end:'12:00'}),/冲突/);
apply(s,sales,'schedule',{...slot,start:'11:00',end:'12:00'});assert.equal(scheduled(s,slot.orderId),3);
assert.throws(()=>apply(s,sales,'schedule',{...slot,start:'25:00',end:'26:00'}),/格式/);
assert.throws(()=>apply(s,sales,'schedule',{...slot,date:'2026-02-31'}),/日期/);
const lesson={orderId:slot.orderId,scheduleId:plan.id,date:today,start:'09:00',end:'11:00',hours:2,content:'函数',feedback:'需复习',homework:'练习'};
apply(s,teacher,'lesson',lesson);const l=s.lessons[0];assert.equal(scheduleStatus(s,plan),'pending');assert.equal(scheduled(s,slot.orderId),1);assert.equal(pending(s,slot.orderId),2);assert.equal(used(s,slot.orderId),0);
assert.throws(()=>apply(s,teacher,'lesson',lesson),/重复/);assert.throws(()=>apply(s,sales,'reschedule',{...plan,reason:'调整'}),/不能再调课/);assert.throws(()=>apply(s,teacher,'leave',{id:plan.id,reason:'请假'}));
assert.throws(()=>apply(s,other,'approve',{id:l.id}));apply(s,sales,'approve',{id:l.id,note:'核实授课'});assert.equal(l.status,'admin');assert.equal(used(s,slot.orderId),0);
apply(s,admin,'reject',{id:l.id,reason:'反馈需要详细'});assert.equal(used(s,slot.orderId),0);assert.equal(scheduled(s,slot.orderId),3);
assert.throws(()=>apply(s,teacher2,'resubmit',{...lesson,id:l.id}));apply(s,teacher,'resubmit',{...lesson,id:l.id,feedback:'学生能独立完成基础题，综合题继续训练'});assert.equal(l.status,'sales');assert.equal(l.revision,2);assert.equal(l.history.filter(h=>h.event==='管理员驳回')[0].note,'反馈需要详细');assert.equal(l.history.find(h=>h.event==='提交消课').snapshot.feedback,'需复习');
apply(s,sales,'approve',{id:l.id,note:'补充后核实'});apply(s,admin,'approve',{id:l.id,note:'确认扣课'});assert.equal(used(s,slot.orderId),2);assert.equal(scheduleStatus(s,plan),'completed');assert.throws(()=>apply(s,admin,'approve',{id:l.id}));assert.throws(()=>apply(s,teacher,'resubmit',{...lesson,id:l.id}));
const otherPlan=s.schedules.find(x=>x.id!==plan.id);apply(s,teacher,'leave',{id:otherPlan.id,reason:'学生请假'});assert.equal(scheduled(s,slot.orderId),0);assert.equal(used(s,slot.orderId),2);assert.throws(()=>apply(s,sales,'reschedule',{...otherPlan,start:'13:00',end:'14:00'}),/原因/);apply(s,sales,'reschedule',{...otherPlan,start:'13:00',end:'14:00',reason:'补课'});assert.equal(otherPlan.status,'planned');assert.equal(otherPlan.history.length,3);assert.equal(scheduled(s,slot.orderId),1);
const tiny={...s.orders[2],hours:1};s.orders[2]=tiny;assert.throws(()=>apply(s,sales,'schedule',{...slot,orderId:tiny.id,start:'15:00',end:'17:00'}),/不足/);
// 无课表的旧订单仍支持正常消课，但不能占用已排课预留余额。
assert.throws(()=>apply(s,teacher,'lesson',{...lesson,scheduleId:undefined,orderId:tiny.id,start:'15:00',end:'17:00'}),/不足/);
assert.equal(waitingHours({status:'sales',stageSince:'2026-10-01T00:00:00Z',created:'2026-01-01'},Date.parse('2026-10-03T01:00:00Z')),49);assert.equal(waitingHours({status:'approved',created:'2026-01-01'}),0);
assert.deepEqual(weekDates('2026-10-10'),['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
console.log('通过：老师与学员冲突、跨订单冲突、排课额度、请假调课、排课关联消课、驳回重提、意见历史、双级审批、重复扣课保护、48小时提醒、周课表日期');
}finally{await rm(dir,{recursive:true,force:true});}
