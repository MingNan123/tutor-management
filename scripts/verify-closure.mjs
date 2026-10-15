import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'tutor-closure-'));
try{
for(const name of ['teaching','permissions','trials','model','finance','workspace-view']){const source=(await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8')).replace(/'\.\/(teaching|trials|permissions|model|finance)'/g,"'./$1.mjs'");await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);}
const {seed,apply,teachingAllowance,teacherAt,teachingBalance}=await import(pathToFileURL(join(dir,'model.mjs')));
const {workspaceView}=await import(pathToFileURL(join(dir,'workspace-view.mjs')));
const {defaultPositions}=await import(pathToFileURL(join(dir,'permissions.mjs')));
const {todayChina}=await import(pathToFileURL(join(dir,'teaching.mjs')));
const today=todayChina(),tomorrow=new Date(Date.parse(today+'T00:00:00Z')+86400000).toISOString().slice(0,10);Date.now=()=>Date.parse(today+'T23:59:59+08:00');
function base(){const s=seed('owner','test@example.com');s.lessons=[];s.schedules=[];s.positions=defaultPositions();s.orders.forEach(o=>{o.date='2026-01-01';o.expiry='2027-12-31'});s.members.forEach(m=>{m.status='active';if(m.role==='teacher')m.employment='fulltime'});return s;}
const plan=(s,id=s.orders[0].id,date=tomorrow)=>({orderId:id,date,start:'10:00',end:'11:00'});
let s=base();apply(s,s.members[1],'order',{studentId:'s1',teacherId:'teacher1',subject:'数学',hours:2,price:100,paid:0,date:today,expiry:'2027-12-31',screenshotId:'test',creditHours:2,availableTeachingHours:99,teachingSummary:{allowance:99},teacherAssignments:[{teacherId:'teacher2',from:today}]});let o=s.orders[0];assert.equal(o.creditHours,undefined);assert.equal(o.availableTeachingHours,undefined);assert.equal(o.teachingSummary,undefined);assert.equal(o.teacherAssignments,undefined);assert.equal(teachingAllowance(o),0);assert.throws(()=>apply(s,s.members[1],'schedule',{...plan(s),end:'14:00'}),/不足/);assert.equal(teachingAllowance({...o,availableTeachingHours:99}),0);
s=base();let v=workspaceView(s,s.members[3]);assert.equal(v.state.orders.length,2);assert(v.state.orders.every(o=>o.price===0&&o.paid===0));assert.equal(v.orderIds.length,0);
apply(s,s.members[0],'adminOrder',{...s.orders[0],teacherId:'teacher2',handoverDate:tomorrow,reason:'交接'});v=workspaceView(s,s.members[3]);assert(v.state.orders.some(o=>o.id===s.orders[0].id));assert.equal(teacherAt(s.orders[0],today),'teacher1');
s=base();apply(s,s.members[1],'schedule',plan(s,undefined,today));apply(s,s.members[0],'adminOrder',{...s.orders[0],teacherId:'teacher2',handoverDate:tomorrow,reason:'交接'});apply(s,s.members[0],'adminSchedule',{...s.schedules[0],date:tomorrow,reason:'调课'});assert.equal(s.schedules[0].teacherId,'teacher2');
s=base();apply(s,s.members[1],'schedule',plan(s));assert.throws(()=>apply(s,s.members[0],'adminOrder',{...s.orders[0],expiry:today,reason:'改有效期'}),/有效期/);
s=base();apply(s,s.members[1],'schedule',plan(s));apply(s,s.members[2],'schedule',plan(s,s.orders[1].id));assert.throws(()=>apply(s,s.members[0],'adminOrder',{...s.orders[0],studentId:'s2',reason:'换学员'}),/冲突/);
s=base();apply(s,s.members[3],'lesson',{orderId:s.orders[0].id,date:today,start:'09:00',end:'10:00',hours:1,content:'教学',feedback:'反馈'});apply(s,s.members[1],'trial',{studentId:'s3',teacherId:'teacher1',subject:'数学',date:today,start:'10:00',end:'11:00',mode:'线上',goal:'试课'});assert.throws(()=>apply(s,s.members[0],'adminLesson',{...s.lessons[0],start:'10:00',end:'11:00',reason:'修正时间'}),/冲突/);
s=base();apply(s,s.members[3],'lesson',{orderId:s.orders[0].id,date:today,start:'09:00',end:'10:00',hours:1,content:'教学',feedback:'反馈'});apply(s,s.members[1],'schedule',plan(s,s.orders[2].id,today));assert.throws(()=>apply(s,s.members[0],'adminLesson',{...s.lessons[0],start:'10:00',end:'11:00',reason:'修正时间'}),/冲突/);assert.throws(()=>apply(s,s.members[0],'adminOrder',{...s.orders[0],studentId:'s3',reason:'历史换学员'}),/已有消课/);
s=base();assert.throws(()=>apply(s,s.members[0],'student',{...s.students[1],name:s.students[0].name,phone:s.students[0].phone}),/已存在/);apply(s,s.members[0],'student',{...s.students[0],school:'更新学校'});
s=base();s.members[3].status='pending';assert.throws(()=>apply(s,s.members[1],'trial',{studentId:'s1',teacherId:'teacher1',subject:'数学',date:tomorrow,start:'10:00',end:'11:00',mode:'线上',goal:'试课'}),/启用/);s.members[3].status='active';s.positions.find(p=>p.id==='pos_fulltime').status='disabled';assert.throws(()=>apply(s,s.members[1],'trial',{studentId:'s1',teacherId:'teacher1',subject:'数学',date:tomorrow,start:'10:00',end:'11:00',mode:'线上',goal:'试课'}),/启用/);
s=base();const count=s.students.length;apply(s,s.members[1],'trial',{studentId:'s1',teacherId:'teacher1',subject:'数学',date:tomorrow,start:'10:00',end:'11:00',mode:'线上',goal:'再次试课'});assert.equal(s.students.length,count);assert.equal(s.trials[0].studentId,'s1');
s=base();apply(s,s.members[3],'lesson',{orderId:s.orders[0].id,date:today,start:'09:00',end:'10:00',hours:1,content:'教学',feedback:'反馈'});apply(s,s.members[0],'adminOrder',{...s.orders[0],teacherId:'teacher2',handoverDate:tomorrow,reason:'交接'});const newView=workspaceView(s,s.members[4]);assert.equal(newView.state.lessons.length,0);assert.equal(teachingBalance(newView.state,newView.state.orders.find(o=>o.id===s.orders[0].id)).pending,1);
console.log('PASS: closure regressions for field authorization, teacher views, handover, order validity, student conflicts, admin lesson conflicts, duplicate edits, active positions, existing-student trials and authoritative balances');
}finally{await rm(dir,{recursive:true,force:true});}
