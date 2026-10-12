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

## 企业规则与验证

- 顾问、全职老师注册后状态为待审核，由管理员在员工账号页面启用；兼职老师仍由顾问代注册。
- 停用职位关闭已有员工的业务操作，个人资料和登录仍可使用。
- 老师默认不查看订单金额；管理员可在职位权限里单独开放。
- 可授课额度 = 实收金额 / 每小时单价 + 管理员批准的欠款课时，上限为合同课时，按分钟向下取整。调整金额与额度不能小于已消和预留课时。
- 老师交接按生效日期调整未消课的未来排课，历史消课和已提交排课保留原老师。
- 课程结束后才能提交消课和试课反馈。
- 业务数据拆分独立表、记录级版本检查；数据库事务竞争由服务端重试。
- 临时截图 24 小时清理；每日北京时间 03:00 私有备份，手动备份在系统设置。详见 cloudflare/RECOVERY.md。

```sh
pnpm typecheck
pnpm build:cloudflare
pnpm test
```

测试使用隔离 Miniflare/D1/R2，不写入生产数据库。更新旧部署前必须先备份，然后迁移（0006），再部署；旧代码不能继续往迁移后的 JSON 写业务数据。回退需连同迁移前的数据库备份一起处理，禁止只回退 Worker。
