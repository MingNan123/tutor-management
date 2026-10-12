export const backupTables=['workspaces','enterprise_accounts','account_initializations','sales_groups','order_screenshots','business_students','business_orders','business_schedules','business_lessons','business_trials','business_followups','business_positions','audit_events'];
export async function cleanup(env,now=Date.now()){
 const cutoff=new Date(now-24*3600000).toISOString();const rows=await env.DB.prepare('SELECT id,object_key FROM order_screenshots WHERE order_id IS NULL AND created<? LIMIT 100').bind(cutoff).all();let removed=0;
 for(const x of rows.results){const linked=await env.DB.prepare("SELECT id FROM business_orders WHERE json_extract(data,'$.screenshotId')=? LIMIT 1").bind(x.id).first();if(linked)continue;await env.BUCKET.delete(x.object_key);const result=await env.DB.prepare('DELETE FROM order_screenshots WHERE id=? AND order_id IS NULL AND created<?').bind(x.id,cutoff).run();removed+=result.meta.changes;}
 await env.DB.batch([env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires_at<?').bind(now),env.DB.prepare('DELETE FROM login_sessions WHERE expires_at<?').bind(now)]);return {removed};
}
export async function backup(env,now=Date.now()){
 const results=await env.DB.batch(backupTables.map(t=>env.DB.prepare('SELECT * FROM '+t)));const tables=Object.fromEntries(backupTables.map((t,i)=>[t,results[i].results]));
 const key='system-backups/'+new Date(now).toISOString().replaceAll(':','-')+'.json';
 for(const meta of tables.order_screenshots.filter(x=>x.order_id)){const target='system-backup-images/'+meta.object_key;if(await env.BUCKET.head(target))continue;const object=await env.BUCKET.get(meta.object_key);if(!object)throw Error('关联订单截图缺失，备份未完成：'+meta.id);await env.BUCKET.put(target,object.body,{httpMetadata:object.httpMetadata});}
 const document={format:'tutor-backup-v1',createdAt:new Date(now).toISOString(),imagesPrefix:'system-backup-images/',tables};await env.BUCKET.put(key,JSON.stringify(document),{httpMetadata:{contentType:'application/json'}});
 let cursor;do{const page=await env.BUCKET.list({prefix:'system-backups/',cursor});for(const object of page.objects)if(object.uploaded.getTime()<now-30*86400000)await env.BUCKET.delete(object.key);cursor=page.truncated?page.cursor:undefined;}while(cursor);
 return {key,records:Object.values(tables).reduce((n,rows)=>n+rows.length,0)};
}
export default {async scheduled(event,env,ctx){ctx.waitUntil((async()=>{await cleanup(env);await backup(env);})());}};
