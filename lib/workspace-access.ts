import {env} from 'cloudflare:workers';
import {currentAccount} from './session';
import {State} from './model';
import {hydrateAccounts,authorizeAccount} from './accounts';
export async function workspaceAccess(){const auth=await currentAccount();const {user,member}=auth;const row=await env.DB!.prepare('SELECT data FROM workspaces WHERE id=?').bind('enterprise').first<{data:string}>();if(!row)throw Error('请先打开企业工作台');const state:State=JSON.parse(row.data);await hydrateAccounts(state);return {user,state,member,owner:auth.platformOwner};}
