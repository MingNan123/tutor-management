export function classEnded(date:string,end:string,now=Date.now()){return validDate(date)&&Number.isFinite(Date.parse(date+'T'+end+':00+08:00'))&&Date.parse(date+'T'+end+':00+08:00')<=now;}
export const todayChina=()=>new Date(Date.now()+8*3600000).toISOString().slice(0,10);
export function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
export function minutes(v:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw Error('上课时间格式不正确');return Number(v.slice(0,2))*60+Number(v.slice(3));}
export function duration(start:string,end:string){const h=(minutes(end)-minutes(start))/60;if(h<=0||h>8)throw Error('上课时长应大于 0 且不超过 8 小时');return h;}
export const overlaps=(a:{date:string;start:string;end:string},b:{date:string;start:string;end:string})=>a.date===b.date&&a.start<b.end&&a.end>b.start;
export function waitingHours(l:{status:string;stageSince?:string;submittedAt?:string;created:string},now=Date.now()){if(!['sales','admin'].includes(l.status))return 0;const t=Date.parse(l.stageSince||l.submittedAt||l.created);return Number.isFinite(t)?Math.max(0,(now-t)/3600000):0;}
export function weekDates(anchor:string){const d=new Date(anchor+'T00:00:00Z');const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()-day+1);return Array.from({length:7},(_,i)=>new Date(d.getTime()+i*86400000).toISOString().slice(0,10));}
