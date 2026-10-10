# 新建空环境部署说明

本目录供源代码仓库部署使用。所有命令从仓库根目录运行，先参阅根 README。

1. 创建 Cloudflare D1 数据库 `tutor-management` 和 R2 存储桶 `tutor-order-screenshots`。R2 如要求开通计费，由账户持有人决定。
2. 复制 `cloudflare/wrangler.example.json` 为 `cloudflare/wrangler.json`。
3. 安装依赖后运行 `pnpm build:cloudflare`、`pnpm cf:login`、`pnpm cf:configure`。
4. 仅对新建空数据库运行 `pnpm cf:migrate`，然后 `pnpm cf:init`，交互设置机构名称和第一位管理员。密码不显示、不保存明文。
5. 运行 `pnpm cf:domain` 填写二级域名，再运行 `pnpm cf:deploy`。

更新现有线上系统时，复用原数据库和存储桶，不初始化。迁移应在备份后显式执行。部署源码不会自动备份或同步旧站点数据。

初始化脚本拒绝覆盖已有机构数据。源代码库不包含业务数据、数据库备份、订单截图或真实账号凭据。
