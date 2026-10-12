import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {backupTables} from '../cloudflare/maintenance.mjs';
export function restoreSQL(document){
 if(document?.format!=='tutor-backup-v1'||!document.tables)throw Error('备份格式不正确');const q=x=>x===null?'NULL':typeof x==='number'&&Number.isFinite(x)?String(x):"'"+String(x).replaceAll("'","''")+"'";
 const token=randomUUID();const statements=[];for(const table of backupTables){const rows=document.tables[table];if(!Array.isArray(rows))throw Error('备份表缺失：'+table);for(const row of rows){const keys=Object.keys(row);if(!keys.length||keys.some(k=>!/^\w+$/.test(k)))throw Error('字段格式错误');statements.push(`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) SELECT ${keys.map(k=>q(row[k])).join(',')} WHERE EXISTS(SELECT 1 FROM recovery_guards WHERE token='${token}' AND ok=1);`);}}
 // Guard the whole restore: triggers abort if the destination contains any business/account data.
 const occupied=backupTables.map(t=>`EXISTS(SELECT 1 FROM ${t})`).join(' OR ');
 return `INSERT INTO recovery_guards(token,ok) SELECT '${token}',CASE WHEN ${occupied} THEN 0 ELSE 1 END;\n${statements.join('\n')}\nDELETE FROM recovery_guards WHERE token='${token}';\n`;
}
if(process.argv[1]?.endsWith('restore-backup.mjs')&&process.argv[2]){const document=JSON.parse(await readFile(process.argv[2],'utf8'));const destination=process.argv[3]||'restore.sql';await writeFile(destination,restoreSQL(document),{mode:0o600});console.log('已生成恢复 SQL，仅用于已完成迁移的空数据库：'+destination);}
