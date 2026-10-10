'use client';
import type {DeletedRecord} from '../../lib/record-management';
const names={students:'学员',orders:'订单',trials:'试课',schedules:'排课',lessons:'消课',followups:'跟进',members:'人员',groups:'小组'};
export default function RecycleBin({records,onRestore}:{records:DeletedRecord[];onRestore:(record:DeletedRecord)=>void}){
 return <section className="card"><div className="cardhead"><h2>数据回收站 <span>{records.length}</span></h2><span className="subtle">仅管理员可查看和恢复</span></div><div className="tablewrap"><table><thead><tr><th>记录类型 / 名称</th><th>删除时间</th><th>操作人 / 原因</th><th>操作</th></tr></thead><tbody>{records.map(x=><tr key={x.id}><td><b>{names[x.kind]} · {x.record.name||x.record.id}</b></td><td>{new Date(x.deletedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</td><td>{x.deletedBy}<small>{x.reason}</small></td><td><button className="link" onClick={()=>onRestore(x)}>恢复记录</button></td></tr>)}</tbody></table>{!records.length&&<div className="empty">暂无已删除记录</div>}</div><div className="rule">恢复时重新检查关联数据、课表冲突和订单额度。恢复人员账号后保持停用，需管理员另行启用。</div></section>;
}
