import {workspaceAccess} from '../../../lib/workspace-access';
import {performanceView} from '../../../lib/performance';
import {validDate,todayChina} from '../../../lib/teaching';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const {member,state}=await workspaceAccess();const params=new URL(req.url).searchParams,from=params.get('from')||todayChina().slice(0,7)+'-01',to=params.get('to')||todayChina();if(!validDate(from)||!validDate(to)||from>to||to>todayChina()||Date.parse(to)-Date.parse(from)>366*86400000)throw Error('请选择不超过 366 天且不晚于今天的有效区间');return Response.json(performanceView(state,member,from,to),{headers:{'Cache-Control':'private, no-store'}});}catch(e:any){return Response.json({error:e.message},{status:403});}}
