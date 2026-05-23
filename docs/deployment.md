# 椰树集团参观预约系统 — 服务部署文档

## 1. 环境要求

| 组件 | 版本要求 | 说明 |
|---|---|---|
| Node.js | >= 18.x | 推荐 20.x LTS |
| MySQL | >= 8.0 | 主数据库 |
| Redis | >= 6.x | 可选，用于队列和缓存 |
| npm | >= 9.x | 包管理器 |
| Nginx | >= 1.20 | 反向代理 (生产环境) |

---

## 2. 项目结构

```
yeshu/
├── backend/           # NestJS 后端服务
├── admin-panel/       # Vue 3 管理后台
├── mini-program/      # 微信小程序
└── docs/              # 文档
```

---

## 3. 后端部署

### 3.1 安装依赖

```bash
cd backend
npm install
```

### 3.2 配置环境变量

复制并编辑 `.env` 文件:

```env
# 服务端口
PORT=3000
NODE_ENV=production

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_secure_password
DB_DATABASE=yeshu_reservation

# Redis (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d

# 微信小程序
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

# 腾讯云 (FaceID 二要素核验)
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
TENCENT_REGION=ap-guangzhou

# 限流
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 3.3 创建数据库

```sql
CREATE DATABASE yeshu_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> 开发环境 TypeORM 会自动同步表结构 (`synchronize: true`)。
> **生产环境务必关闭 `synchronize`**，使用 Migration 管理数据库变更。

### 3.4 编译与启动

```bash
# 编译
npm run build

# 生产模式启动
npm run start:prod

# 开发模式 (热重载)
npm run start:dev
```

编译输出在 `backend/dist/` 目录。服务监听 `http://localhost:3000`。

### 3.5 首次初始化

启动后，需要创建超级管理员账号。可用数据库脚本或临时 API:

```sql
-- 创建超级管理员 (密码: admin123, bcrypt hash)
INSERT INTO admin_users (username, passwordHash, nickname, isSuperAdmin, status)
VALUES ('admin', '$2b$10$IGxCAaf6/3kKfsgpZ0saOOoTNwutAaJUtpSPqsCMY1jHoiGNFzp92', '管理员', 1, 1);
```

### 3.6 自启动 (PM2)

```bash
npm install -g pm2
pm2 start dist/main.js --name yeshu-api
pm2 save
pm2 startup
```

常用 PM2 命令:
```bash
pm2 restart yeshu-api    # 重启服务
pm2 logs yeshu-api       # 查看日志
pm2 status               # 查看状态
```

### 3.7 生产环境实际部署

服务器: `ubuntu@1.12.49.190`
项目路径: `/home/ubuntu/yeshu`

部署脚本 `deploy.sh`:
```bash
#!/bin/bash
cd /home/ubuntu/yeshu/backend
git pull
npm install
npm run build
pm2 restart yeshu-api
```

---

## 4. 管理后台部署

### 4.1 安装依赖与构建

```bash
cd admin-panel
npm install
npm run build
```

构建输出在 `admin-panel/dist/` 目录，为纯静态文件。

### 4.2 配置 API 地址

构建前修改 `vite.config.ts` 中的代理配置，或在 `.env.production` 中设置:

```env
VITE_API_BASE=https://your-domain.com/api
```

### 4.3 Nginx 配置

生产环境使用域名 `yuyue.yeshu.com`，SSL 由 Let's Encrypt 提供。

```nginx
server {
    listen 443 ssl;
    server_name yuyue.yeshu.com;

    ssl_certificate     /etc/letsencrypt/live/yuyue.yeshu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yuyue.yeshu.com/privkey.pem;

    # 管理后台静态文件
    root /home/ubuntu/yeshu/admin-panel/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://localhost:3000;
    }
}

server {
    listen 80;
    server_name yuyue.yeshu.com;
    return 301 https://$host$request_uri;
}
```

Nginx 配置文件位于 `/etc/nginx/sites-available/yuyue.yeshu.com`。

---

## 5. 微信小程序部署

### 5.1 配置服务器地址

在 `mini-program/config.ts` 中设置 API 地址:

```typescript
const PROD_URL = 'https://yuyue.yeshu.com/api'
```

开发环境自动根据 `wx.getAccountInfoSync()` 切换环境。

### 5.2 微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择 `mini-program/` 目录
3. 填入 AppID (在 `project.config.json` 中配置)
4. 编译预览

### 5.3 上传发布

1. 在微信开发者工具中点击「上传」
2. 登录 [微信公众平台](https://mp.weixin.qq.com) 
3. 进入「版本管理」→ 选择版本 →「提交审核」
4. 审核通过后发布

### 5.4 服务器域名配置

在微信公众平台「开发 → 开发管理 → 开发设置」中配置:

| 类型 | 域名 |
|---|---|
| request合法域名 | `https://yuyue.yeshu.com` |
| uploadFile合法域名 | `https://yuyue.yeshu.com` |
| downloadFile合法域名 | `https://yuyue.yeshu.com` |
| socket合法域名 | (不涉及) |

---

## 6. 生产环境检查清单

- [ ] `.env` 中 `NODE_ENV=production`
- [ ] `JWT_SECRET` 已更换为强随机字符串
- [ ] 数据库密码已设置
- [ ] TypeORM `synchronize` 已关闭
- [ ] Nginx HTTPS 已配置
- [ ] 微信小程序服务器域名已配置
- [ ] 腾讯云密钥权限已最小化
- [ ] 防火墙仅开放 80/443 端口
- [ ] 数据库定期备份已配置
- [ ] 日志轮转已配置

---

## 7. 常见问题

### Q: 后端启动报 Redis 连接错误
A: 如果没有 Redis，后端仍可运行（Redis 是可选组件）。或在 `.env` 中配置正确的 Redis 连接信息。

### Q: 管理后台登录报 404
A: 检查 Nginx 配置中 `/api/` 反向代理是否正确指向后端。

### Q: 小程序请求失败
A: 检查微信公众平台的服务器域名配置，确认 HTTPS 证书有效。

### Q: 上传文件无法访问
A: 检查 Nginx 中 `/uploads/` 路径配置，以及后端 `main.ts` 中的 `ServeStaticModule` 配置。
