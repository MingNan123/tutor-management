import {currentAccount} from './session';
import {loadState} from './state-store';
export async function workspaceAccess(){const auth=await currentAccount();const {state}=await loadState();const member=state.members.find(x=>x.id===auth.member.id);if(!member||member.status!=='active')throw Error('账号已停用');return {user:auth.user,state,member,owner:auth.platformOwner};}
