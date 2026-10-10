import {can,inScope} from '../../../lib/permissions';
import {env} from 'cloudflare:workers';
import {currentAccount} from '../../../lib/session';
import {checkOrigin} from '../../../lib/password';
import type {State} from '../../../lib/model';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{checkOrigin(req);const {member}=await currentAccount();if(!['admin','sales'].includes(member.role))throw Error('仅顾问和管理员可核查客户');const b:any=await req.json();const phone=String(b.phone||'').trim();if(!/^1\d{10}$/.test(phone))throw Error('请填写 11 位家长手机号');const row=await env.DB!.prepare('SELECT data FROM workspaces WHERE id=?').bind('enterprise').first<any>();if(!row)throw Error('机构尚未初始化');const s:State=JSON.parse(row.data);const candidates=s.students.filter(st=>st.phone===phone&&st.id!==b.id);if(!can(s,member,'students.view')||!can(s,member,'students.create')&&!can(s,member,'students.edit'))throw Error('当前职位无权核查客户');const visible=candidates.filter(st=>inScope(s,member,'students',st.salesId));return Response.json({matches:visible.map(st=>({id:st.id,name:st.name,stage:st.stage,grade:st.grade,sameName:st.name===String(b.name||'').trim()})),otherCount:candidates.length-visible.length,total:candidates.length},{headers:{'Cache-Control':'no-store'}});}catch(e:any){return Response.json({error:e.message},{status:400});}}
