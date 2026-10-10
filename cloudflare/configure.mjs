import {readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
const rl=createInterface({input:stdin,output:stdout});
try {
  const c=JSON.parse(await readFile('wrangler.json','utf8'));
  if(process.argv[2]==='domain') {
    const domain=(await rl.question('绑定二级域名（默认 jiaowu.mingshop123.com）：')).trim()||'jiaowu.mingshop123.com';
    if(!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.mingshop123\.com$/.test(domain))throw Error('请输入 mingshop123.com 下的一个二级域名');
    const answer=await rl.question('请先确认该域名未被其他站点使用。输入 BIND 保存域名配置：');
    if(answer!=='BIND')throw Error('未绑定，配置保持原样');
    c.routes=[{pattern:domain,custom_domain:true}];
  } else {
    const account=(await rl.question('Cloudflare Account ID（账户 ID，不是密钥）：')).trim();
    const database=(await rl.question('新建 D1 返回的 database_id：')).trim();
    if(!/^[a-f0-9]{32}$/i.test(account))throw Error('账户 ID 格式不正确');
    if(!/^[a-f0-9-]{36}$/i.test(database))throw Error('数据库 ID 格式不正确');
    c.account_id=account;c.d1_databases[0].database_id=database;
    const bucket=(await rl.question('R2 bucket 名称（默认 tutor-order-screenshots）：')).trim()||'tutor-order-screenshots';
    if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw Error('存储桶名称格式不正确');
    c.r2_buckets[0].bucket_name=bucket;
  }
  await writeFile('wrangler.json',JSON.stringify(c,null,2)+'\n');
  console.log('配置已保存。');
} finally {rl.close();}
