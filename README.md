# 家教管理系统

面向小初高一对一辅导机构，包含账号注册登录、学员档案、订单截图、排课、消课双重审批、每周试课、客户跟进、兼职老师归属、管理员小组及职位权限设置。账号和业务数据存储于 Cloudflare D1，订单截图存储于 R2。

线上地址：https://jiaowu.mingshop123.com

## 安装与构建

Node.js >= 22.13，使用 package.json 指定的 pnpm 版本。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build:cloudflare
```

## Cloudflare 部署

```sh
cp cloudflare/wrangler.example.json cloudflare/wrangler.json
pnpm cf:login
pnpm cf:configure
pnpm cf:deploy
```

Windows PowerShell 使用 `Copy-Item` 代替 `cp` 亦可。配置时填写已有 Cloudflare Account ID、D1 database_id 和 R2 bucket 名称。绑定域名使用 `pnpm cf:domain` 后再部署。

**更新现有线上系统时，复用原 D1 和 R2，不运行初始化、不新建机构。** 数据库迁移通过 `pnpm cf:migrate` 显式执行；操作前先备份。新建空数据库才运行迁移和 `pnpm cf:init` 创建首位管理员。

详细的新部署说明见 cloudflare/README.md（原独立部署包命令，源码仓库中对应使用上述 cf:* 命令）。

## 数据与安全

仓库只包含源代码、数据库表结构和部署模板。密码、会话、业务数据、订单图片、Cloudflare 登录凭据及本地配置均不进入版本控制。生产入口过滤平台身份请求头，使用账号密码认证；平台登录路径在独立部署中禁用。

原始托管环境的构建工具保留于 build 和 scripts；`.openai/hosting.json` 仅声明 DB、BUCKET 绑定，不包含原站点标识。

## 岗位与增删改查

| 岗位 | 排课 | 消课 | 人员管理 | 客户业务 |
|---|---|---|---|---|
| 管理员（各级相同） | 全机构新增、调整、请假、删除 | 复核、修正、删除；不能重复扣课 | 新增、编辑职位与分组、启停；无关联账号可删除 | 全机构管理 |
| 课程顾问 | 本人客户排课的新增、调整、请假、删除 | 对应订单初审，可查看；不能修改老师授课内容或最终扣课 | 代注册、维护、启停本人所属兼职；无关联兼职可删除 | 本人学员、订单、试课、普通跟进增删改查 |
| 教务 | 全机构新增、调整、请假、删除，统一校验冲突和额度 | 查看教学记录，不审批或改动扣课 | 不管理员工登录或职位权限 | 安排、改期、确认、删除无关联试课；不修改费用或客户跟进 |
| 授课老师 | 查看本人课表，登记本人请假 | 提交本人授课、修改重提或删除本人被驳回记录 | 编辑个人资料 | 查看关联学员的教学资料，不查看订单金额与家长私人联系方式 |

职位权限与员工单独权限支持进一步收紧，查看权限撤销后相应写入权限一起失效。顾问可由管理员配置本人、小组或全机构数据范围，但其他顾问所属兼职仍按归属隔离。

删除必须填写原因并保留在管理员回收站。有关联记录的学员、订单、试课、排课和人员需先处理关联或交接，不能直接级联删除。删除人员账号会同时停用账号并撤销其会话；恢复后仍停用，需要管理员显式启用。小组删除前应移出其他组员，组长自动移出，恢复时重新校验归属。恢复教学记录重新检查时间冲突和订单额度。

验证：

```sh
node scripts/verify-login.mjs
node scripts/verify-record-management.mjs
node scripts/verify-teaching.mjs
node scripts/verify-trials.mjs
node scripts/verify-accounts.mjs
node scripts/verify-account-database.mjs
```
