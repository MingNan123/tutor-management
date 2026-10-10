import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {accountFromRow,authorizeAccount,hydrateAccounts} from './accounts';
import {SESSION_COOKIE,digest} from './password';
export async function currentAccount(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token){const row=await env.DB!.prepare('SELECT a.* FROM login_sessions s JOIN enterprise_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first<any>();if(!row||row.status!=='active')throw Error('登录已失效或账号已停用，请重新登录');return {member:accountFromRow(row),user:{userId:row.id,email:row.email||''},platformOwner:false};}const platform=await getChatGPTUser();if(platform){const row=await env.DB!.prepare('SELECT data FROM workspaces WHERE id=?').bind('enterprise').first<any>();if(row&&JSON.parse(row.data).owner===platform.userId){await hydrateAccounts(JSON.parse(row.data));const member=await authorizeAccount(platform);if(member.hasPassword)throw Error('请使用账号密码登录');return {member,user:{userId:member.id,email:member.email},platformOwner:true};}}throw Error('请先登录');}
