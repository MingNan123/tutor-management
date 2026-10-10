import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'tutor-records-'));
try{
 for(const name of ['teaching','permissions','trials','record-management','model','workspace-view']){
  const source=(await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8')).replace(/'\.\/(teaching|trials|permissions|record-management|model)'/g,"'./$1.mjs'");
  await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
 }
 const {seed,apply,used,pending,scheduled}=await import(pathToFileURL(join(dir,'model.mjs')));
 const {defaults,defaultPositions,can}=await import(pathToFileURL(join(dir,'permissions.mjs')));
 const {workspaceView}=await import(pathToFileURL(join(dir,'workspace-view.mjs')));
 const {todayChina}=await import(pathToFileURL(join(dir,'teaching.mjs')));
 const s=seed('owner','owner@example.com');s.positions=defaultPositions();s.lessons=[];s.orders.forEach(o=>{o.date='2026-01-01';o.expiry='2027-12-31'});
 const [admin,sales,other,teacher,privateTeacher]=s.members;teacher.employment='fulltime';privateTeacher.employment='parttime';privateTeacher.ownerSalesId=other.id;
 const edu={id:'edu',name:'教务',role:'education',email:'edu@example.com',status:'active'};s.members.push(edu);
 const today=todayChina(),o=s.orders[0],slot={orderId:o.id,date:today,start:'09:00',end:'10:00',location:'教室'};
 const del=(m,kind,id)=>apply(s,m,'recordDelete',{kind,id,reason:'核实错误记录'});
 const restore=()=>apply(s,admin,'recordRestore',{id:s.deletedRecords[0].id,reason:'复核后恢复'});
 assert.throws(()=>apply(s,teacher,'schedule',slot),/权限/);assert.throws(()=>apply(s,other,'schedule',slot));
 apply(s,edu,'schedule',slot);const plan=s.schedules[0];assert.equal(scheduled(s,o.id),1);
 assert.throws(()=>apply(s,admin,'adminSchedule',{...plan,start:'10:00',end:'20:00',reason:'异常修改',status:'planned'}),/时长/);
 assert.throws(()=>apply(s,edu,'adminSchedule',{...plan,reason:'越权'}),/权限/);
 assert.throws(()=>del(other,'schedules',plan.id),/范围/);del(edu,'schedules',plan.id);assert.equal(scheduled(s,o.id),0);o.hours=0;assert.throws(restore,/额度/);o.hours=40;
 assert.equal(workspaceView(s,sales).state.deletedRecords.length,0);assert.throws(()=>apply(s,edu,'recordRestore',{id:s.deletedRecords[0].id,reason:'越权'}),/管理员/);
 apply(s,sales,'schedule',slot);assert.throws(restore,/冲突/);del(sales,'schedules',s.schedules[0].id);restore();assert.equal(scheduled(s,o.id),1);
 apply(s,sales,'reschedule',{...s.schedules[0],start:'10:00',end:'11:00',reason:'调整'});restore();assert.equal(s.schedules.length,2);
 const lessonInput={...slot,scheduleId:plan.id,hours:1,content:'数学练习',feedback:'课堂反馈'};
 apply(s,teacher,'lesson',lessonInput);const lesson=s.lessons[0];assert.equal(pending(s,o.id),1);
 assert.throws(()=>del(teacher,'lessons',lesson.id),/被驳回/);assert.throws(()=>del(sales,'lessons',lesson.id),/无权/);assert.throws(()=>del(admin,'schedules',plan.id),/消课/);
 assert.throws(()=>apply(s,admin,'adminSchedule',{...plan,reason:'绕过已消课保护',status:'planned'}),/不能再调课/);
 apply(s,sales,'reject',{id:lesson.id,reason:'补充反馈'});del(teacher,'lessons',lesson.id);assert.equal(s.lessons.length,0);restore();assert.equal(s.lessons[0].status,'rejected');
 apply(s,teacher,'resubmit',{...lessonInput,id:lesson.id});apply(s,sales,'approve',{id:lesson.id});assert.throws(()=>apply(s,edu,'approve',{id:lesson.id}),/权限/);apply(s,admin,'approve',{id:lesson.id});assert.equal(used(s,o.id),1);
 assert.throws(()=>del(teacher,'lessons',lesson.id),/被驳回/);del(admin,'lessons',lesson.id);assert.equal(used(s,o.id),0);restore();assert.equal(used(s,o.id),1);
 assert.throws(()=>del(admin,'orders',o.id),/关联/);assert.throws(()=>del(admin,'students','s1'),/关联/);
 apply(s,sales,'orderEdit',{...o,price:185,reason:'核对金额'});assert.equal(o.price,185);assert.throws(()=>apply(s,other,'orderEdit',{...o,reason:'越权'}),/范围/);
 assert.throws(()=>apply(s,sales,'orderEdit',{...o,teacherId:privateTeacher.id,reason:'换老师'}));
 apply(s,sales,'followup',{studentId:'s1',date:today,method:'电话',content:'联系家长',nextDate:today});const f=s.followups[0];
 assert.throws(()=>apply(s,other,'followupEdit',{...f,content:'越权',reason:'越权'}),/范围/);
 apply(s,sales,'followupEdit',{...f,content:'已联系家长',reason:'修正'});assert.equal(f.content,'已联系家长');del(sales,'followups',f.id);restore();assert.equal(s.followups[0].content,'已联系家长');
 apply(s,sales,'student',{name:'新学员',parent:'家长',phone:'13912345678',stage:'初中',grade:'初一'});const st=s.students[0];del(sales,'students',st.id);restore();assert.ok(s.students.some(x=>x.id===st.id));
 assert.throws(()=>del(sales,'members',privateTeacher.id),/所属/);assert.throws(()=>del(admin,'members',teacher.id),/关联/);assert.throws(()=>del(admin,'members',admin.id),/当前/);
 apply(s,admin,'member',{name:'本人兼职',username:'owned_teacher',role:'teacher',employment:'parttime',ownerSalesId:sales.id,email:'owned@example.com',status:'active'});const owned=s.members.at(-1);
 apply(s,sales,'teacherStatus',{id:owned.id,status:'disabled'});assert.equal(owned.status,'disabled');assert.throws(()=>apply(s,other,'teacherStatus',{id:owned.id,status:'active'}),/所属/);
 del(sales,'members',owned.id);assert.ok(!s.members.some(x=>x.id===owned.id));restore();assert.equal(s.members.find(x=>x.id===owned.id).status,'disabled');
 apply(s,admin,'groupCreate',{name:'测试组',leaderId:sales.id});const group=s.groups[0];apply(s,admin,'memberUpdate',{...other,groupId:group.id});assert.throws(()=>del(admin,'groups',group.id),/移出/);
 apply(s,admin,'memberUpdate',{...other,groupId:''});del(admin,'groups',group.id);assert.equal(sales.groupId,'');restore();assert.equal(sales.groupId,group.id);
 const eduView=workspaceView(s,edu);assert.equal(eduView.orderIds.length,0);assert.ok(eduView.state.orders.every(x=>x.price===0&&x.paid===0));assert.ok(eduView.state.students.every(x=>!x.phone&&!x.address));assert.equal(can(s,teacher,'orders.view'),false);
 const disabled=defaults(sales);disabled.grants['schedule.delete']=false;sales.permissionOverrides=disabled;assert.throws(()=>del(sales,'schedules',s.schedules[0].id),/无权/);sales.permissionOverrides=undefined;
 // Old built-in templates gain new operations without overriding explicit revocations.
 const pos=s.positions.find(p=>p.id==='pos_sales');delete pos.policy.grants['students.delete'];assert.equal(can(s,sales,'students.delete'),true);pos.policy.grants['students.delete']=false;assert.equal(can(s,sales,'students.delete'),false);
 console.log('通过：岗位增删改查、教务排课无财务泄漏、跨顾问拒绝、课表冲突及额度、已审批消课保护、删除恢复、人员归属和关联保护、权限撤销');
}finally{await rm(dir,{recursive:true,force:true});}
