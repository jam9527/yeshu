# 椰树集团参观预约小程序

基于微信小程序的椰树集团参观预约系统，支持个人预约、团队预约、核销管理、推广裂变等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端（小程序） | 微信小程序原生框架 + TypeScript + Sass |
| 管理后台 | Vue 3 + Element Plus + Vite + TypeScript |
| 后端 | NestJS 11 + TypeORM + MySQL 8.4 |
| 任务调度 | @nestjs/schedule（Cron） |
| 实名认证 | 腾讯云 FaceID |
| 文件存储 | 本地文件系统 / 腾讯云 COS |

## 项目结构

```
yeshu/
├── mini-program/          # 微信小程序
│   ├── pages/             # 主包页面（首页、预约、个人中心等）
│   ├── pages-verifier/    # 分包 - 核销员功能
│   ├── utils/             # 工具库（API 请求、认证）
│   ├── app.ts             # 小程序入口
│   └── app.json           # 全局配置
├── backend/               # NestJS 后端
│   ├── src/
│   │   ├── modules/       # 业务模块（auth、reservation、verification 等）
│   │   ├── common/        # 公共模块（守卫、装饰器、过滤器）
│   │   └── database/      # 数据库配置
│   └── uploads/           # 文件上传目录
├── admin-panel/           # Vue 3 管理后台
│   └── src/views/         # 页面视图
└── mysql-data/            # MySQL Docker 数据卷（本地开发）
```

## 快速开始

### 前置条件

- Node.js >= 18
- MySQL 8.4
- 微信开发者工具

### 1. 启动数据库

```bash
# 方式一：Docker
docker run -d --name yeshu-mysql \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
  -e MYSQL_DATABASE=yeshu_reservation \
  -p 3306:3306 \
  mysql:8.4

# 方式二：已有 MySQL 实例，创建数据库
mysql -u root -e "CREATE DATABASE IF NOT EXISTS yeshu_reservation"
```

### 2. 启动后端

```bash
cd backend
npm install
cp .env.example .env    # 编辑数据库连接等配置
npm run start:dev       # 开发模式（热重载）
```

首次启动会自动同步数据库表结构。可通过 API 种子测试数据：
```
POST /api/reservations/seed-dates
POST /api/reservations/seed-frequency-limits
```

### 3. 启动管理后台

```bash
cd admin-panel
npm install
npm run dev             # 默认 http://localhost:5173
```

### 4. 编译并预览小程序

```bash
cd mini-program
npm install
npm run build           # 编译 TS → JS + 后处理
```

用微信开发者工具打开 `mini-program` 目录，使用测试号或已注册的 AppID 预览。

### 编译说明

小程序使用原生 `enhance: false` 模式，TypeScript 需预编译为 JavaScript：

```bash
npm run build    # tsc + 自动移除 __esModule 兼容代码
```

每次修改 `.ts` 文件后需重新编译。`utils/` 工具库保留 CommonJS 模块导出（通过 `require()` 加载）。

## 模块功能

| 模块 | 功能 |
|------|------|
| 首页 | DIY 可视化配置（轮播图、功能入口、标语、展厅列表等） |
| 预约 | 个人预约（1-5人）、团队预约（>=10人）、审核流程 |
| 核销 | 扫码核销、核销记录、核销统计 |
| 实名认证 | 腾讯云 FaceID 身份核验 |
| 推广 | 推广员二维码、推广统计、裂变分享 |
| 内容管理 | 展厅、活动、常见问题 CRUD |
| 通知 | 审核结果通知、未读角标 |
| 定时任务 | 过期预约处理、自动拉黑、滚动创建预约日期 |

## 状态流转

**个人预约：** `PENDING` → 核销 → `VERIFIED`
**团队预约：** `APPROVING` → 审核通过 → `APPROVED` → 核销 → `VERIFIED`
**取消/过期：** 任意状态 → `CANCELLED` / `EXPIRED` / `REJECTED`
