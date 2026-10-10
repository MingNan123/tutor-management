import type {State,Member} from './model';
import {can,inScope} from './permissions';
import type {PermissionKey,ScopeKey} from './permissions';
import {overlaps,validDate} from './teaching';

export const recordKinds=['students','orders','trials','schedules','lessons','followups','members','groups'] as const;
export type RecordKind=typeof recordKinds[number];
export type DeletedRecord={id:string;kind:RecordKind;record:any;deletedAt:string;deletedBy:string;reason:string};
const permissions:Record<RecordKind,PermissionKey>={students:'students.delete',orders:'orders.delete',trials:'trials.delete',schedules:'schedule.delete',lessons:'lessons.delete',followups:'followups.delete',members:'team.delete',groups:'groups.manage'};
const scopes:Partial<Record<RecordKind,ScopeKey>>={students:'students',orders:'orders',trials:'trials',schedules:'schedule',lessons:'lessons',followups:'followups'};
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message)};
const rows=(s:State,kind:RecordKind):any[]=>(s[kind]||[]) as any[];
function teacherAccess(s:State,m:Member,id:string){return m.role==='admin'||m.role==='education'||m.id===id||s.members.some(t=>t.id===id&&(t.employment==='fulltime'||m.role==='sales'&&t.ownerSalesId===m.id));}
function access(s:State,m:Member,kind:RecordKind,r:any){
  const scope=scopes[kind];if(!scope)return m.role==='admin'||kind==='members'&&m.role==='sales'&&r.role==='teacher'&&r.employment==='parttime'&&r.ownerSalesId===m.id;
  const order=kind==='schedules'||kind==='lessons'?s.orders.find(o=>o.id===r.orderId):undefined;
  return inScope(s,m,scope,order?.salesId||r.salesId,r.teacherId)&&(!r.teacherId||teacherAccess(s,m,r.teacherId));
}
function deletable(s:State,m:Member,kind:RecordKind,r:any){
  need(access(s,m,kind,r),'该记录不在当前岗位的数据范围内');
  if(kind==='students')need(!s.orders.some(o=>o.studentId===r.id)&&!s.trials?.some(t=>t.studentId===r.id)&&!s.followups?.some(f=>f.studentId===r.id),'学员有关联订单、试课或跟进，请先处理关联记录');
  if(kind==='orders')need(!s.schedules?.some(x=>x.orderId===r.id)&&!s.lessons.some(l=>l.orderId===r.id)&&!s.trials?.some(t=>t.orderId===r.id),'订单有关联排课、消课或已成交试课，不能删除');
  if(kind==='schedules')need(!s.lessons.some(l=>l.scheduleId===r.id),'排课已有消课记录，请先处理关联消课');
  if(kind==='trials')need(!r.orderId&&!s.orders.some(o=>o.trialId===r.id)&&!s.followups?.some(f=>f.trialId===r.id),'试课已关联订单或客户跟进，不能删除');
  if(kind==='lessons'&&m.role!=='admin')need(m.role==='teacher'&&r.teacherId===m.id&&r.status==='rejected','老师只能删除本人被驳回的消课申请');
  if(kind==='followups')need(!r.trialId,'试课跟进请在试课详情中维护，保留试课变更记录');
  if(kind==='members'){
    need(r.id!==m.id,'不能删除当前登录账号');
    need(!s.students.some(st=>st.salesId===r.id)&&!s.orders.some(o=>o.salesId===r.id||o.teacherId===r.id)&&!s.trials?.some(t=>t.salesId===r.id||t.teacherId===r.id)&&!s.followups?.some(f=>f.salesId===r.id)&&!s.lessons.some(l=>l.teacherId===r.id)&&!s.schedules?.some(x=>x.teacherId===r.id)&&!s.groups?.some(g=>g.leaderId===r.id)&&!s.members.some(t=>t.ownerSalesId===r.id),'人员仍有关联业务、小组或所属老师，请停用账号或先交接');
    if(r.role==='admin')need(s.members.some(t=>t.id!==r.id&&t.role==='admin'&&t.status!=='disabled'),'必须保留至少一名启用的管理员');
  }
  if(kind==='groups')need(!s.members.some(x=>x.groupId===r.id&&x.id!==r.leaderId),'请先由管理员将其他小组成员移出后再删除小组');
}
function restore(s:State,entry:DeletedRecord){
  const r=entry.record,kind=entry.kind;
  need(!rows(s,kind).some(x=>x.id===r.id),'记录已存在，不能重复恢复');
  if(kind==='students')need(s.members.some(m=>m.id===r.salesId&&m.role==='sales')&&!s.students.some(st=>st.name===r.name&&st.phone===r.phone),'请先恢复负责顾问，并核对是否存在同名同手机号学员');
  if(kind==='orders')need(s.students.some(st=>st.id===r.studentId)&&s.members.some(m=>m.id===r.salesId&&m.role==='sales')&&s.members.some(m=>m.id===r.teacherId&&m.role==='teacher'),'请先恢复关联学员、顾问和老师');
  if(kind==='followups')need(s.students.some(st=>st.id===r.studentId)&&s.members.some(m=>m.id===r.salesId&&m.role==='sales'),'请先恢复关联学员与顾问');
  if(kind==='members'){
    need(!s.members.some(m=>r.username&&m.username===r.username||r.email&&m.email===r.email),'账号或邮箱已被使用');
    need(!r.groupId||s.groups?.some(g=>g.id===r.groupId),'请先恢复所属小组');
    need(!r.ownerSalesId||s.members.some(m=>m.id===r.ownerSalesId&&m.role==='sales'),'请先恢复所属顾问');
    r.status='disabled';r.updatedAt=new Date().toISOString();
  }
  if(kind==='groups'){
    const leader=s.members.find(m=>m.id===r.leaderId&&m.role==='sales'&&m.status!=='disabled');
    need(!s.groups?.some(g=>g.name===r.name)&&leader&&!leader.groupId,'请先恢复并启用组长，且组长不能属于其他小组');
    leader!.groupId=r.id;leader!.updatedAt=new Date().toISOString();
  }
  if(kind==='trials'||kind==='schedules'||kind==='lessons'){
    const order=kind!=='trials'?s.orders.find(o=>o.id===r.orderId):undefined;
    need(kind==='trials'?s.students.some(st=>st.id===r.studentId)&&s.members.some(m=>m.id===r.salesId&&m.role==='sales'):order,'请先恢复关联学员、顾问或订单');
    need(s.members.some(m=>m.id===r.teacherId&&m.role==='teacher'),'请先恢复授课老师');
    const studentId=order?.studentId||r.studentId;
    const occupies=kind==='trials'?!['cancelled','absent'].includes(r.status):kind==='schedules'?r.status==='planned':r.status!=='rejected';
    if(occupies){
      need(!s.trials?.some(t=>!['cancelled','absent'].includes(t.status)&&(t.teacherId===r.teacherId||t.studentId===studentId)&&overlaps(t,r)),'恢复后与试课时间冲突');
      need(!s.schedules?.some(x=>x.id!==r.scheduleId&&x.status==='planned'&&(x.teacherId===r.teacherId||s.orders.find(o=>o.id===x.orderId)?.studentId===studentId)&&overlaps(x,r)),'恢复后与排课时间冲突');
      need(!s.lessons.some(l=>l.status!=='rejected'&&(l.teacherId===r.teacherId||s.orders.find(o=>o.id===l.orderId)?.studentId===studentId)&&overlaps(l,r)),'恢复后与消课时间冲突');
    }
    if(kind==='lessons'&&r.scheduleId)need(s.schedules?.some(x=>x.id===r.scheduleId&&x.orderId===r.orderId&&x.teacherId===r.teacherId&&x.date===r.date&&x.start===r.start&&x.end===r.end&&x.status==='planned'),'请先恢复关联排课，并核对日期时间');
    if(order&&occupies){
      const consuming=s.lessons.filter(l=>l.orderId===order.id&&l.status!=='rejected').reduce((a,l)=>a+l.hours,0);
      const booked=(s.schedules||[]).filter(x=>x.orderId===order.id&&x.status==='planned'&&x.id!==r.scheduleId&&!s.lessons.some(l=>l.scheduleId===x.id&&l.status!=='rejected')).reduce((a,x)=>a+x.hours,0);
      need(consuming+booked+r.hours<=order.hours,'恢复后课时超过订单额度');
    }
  }
  rows(s,kind).unshift(r);
}
export function applyRecordManagement(s:State,m:Member,op:string,p:any){
  if(!['recordDelete','recordRestore','followupEdit','teacherStatus'].includes(op))return false;
  const now=new Date().toISOString(),reason=String(p.reason||'').trim();
  if(op==='teacherStatus'){
    need(can(s,m,'teachers.manage')&&can(s,m,'teachers.view'),'当前岗位无权管理老师');
    const t=s.members.find(t=>t.id===p.id);
    need(t?.role==='teacher'&&(m.role==='admin'||m.role==='sales'&&t.employment==='parttime'&&t.ownerSalesId===m.id),'只能管理本人所属兼职老师');
    need(['active','disabled'].includes(p.status),'账号状态不正确');t!.status=p.status;t!.updatedAt=now;
  }else if(op==='followupEdit'){
    need(can(s,m,'followups.edit'),'当前岗位无权编辑跟进');const f=s.followups?.find(f=>f.id===p.id);
    need(f&&access(s,m,'followups',f),'跟进不存在或不在当前数据范围');need(!f!.trialId,'请通过试课详情记录试课跟进');
    need(reason&&String(p.content||'').trim()&&validDate(p.date)&&(!p.nextDate||validDate(p.nextDate)),'请填写修改原因、跟进内容与有效日期');
    s.logs.unshift({id:crypto.randomUUID(),date:now,actor:m.name,action:'跟进修改前：'+JSON.stringify(f)});
    Object.assign(f!,{date:p.date,method:String(p.method||'').trim(),content:String(p.content).trim(),nextDate:String(p.nextDate||'').trim()});
  }else if(op==='recordDelete'){
    const kind=p.kind as RecordKind;need(recordKinds.includes(kind),'记录类型不正确');
    const permission=kind==='members'&&m.role==='sales'?'teachers.delete':permissions[kind];need(can(s,m,permission),'当前岗位无权删除此类数据');
    const record=rows(s,kind).find(r=>r.id===p.id);need(record,'记录不存在');need(reason,'删除必须填写原因');
    if(kind==='members'&&m.role==='sales')need(record.role==='teacher'&&record.employment==='parttime'&&record.ownerSalesId===m.id&&can(s,m,'teachers.view'),'只能删除本人所属兼职老师');
    deletable(s,m,kind,record);
    s.deletedRecords ||= [];s.deletedRecords.unshift({id:crypto.randomUUID(),kind,record:JSON.parse(JSON.stringify(record)),deletedAt:now,deletedBy:m.name,reason});
    if(kind==='groups')for(const member of s.members.filter(x=>x.groupId===record.id)){member.groupId='';member.updatedAt=now;}
    (s as any)[kind]=rows(s,kind).filter(r=>r.id!==record.id);
  }else{
    need(m.role==='admin','仅管理员可恢复已删除数据');const entry=s.deletedRecords?.find(e=>e.id===p.id);need(entry,'删除记录不存在');need(reason,'恢复必须填写原因');
    s.trials ||= [];s.schedules ||= [];s.followups ||= [];s.groups ||= [];
    restore(s,JSON.parse(JSON.stringify(entry)));s.deletedRecords=s.deletedRecords!.filter(e=>e.id!==entry!.id);
  }
  s.logs.unshift({id:crypto.randomUUID(),date:now,actor:m.name,action:({recordDelete:'删除记录（可恢复）',recordRestore:'恢复记录',followupEdit:'编辑跟进',teacherStatus:'调整老师账号状态'} as any)[op]+' · '+(p.kind||'')+' · '+p.id+'；'+reason});return true;
}
