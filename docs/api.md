# 椰树集团参观预约系统 — API 接口文档

## 概述

- 基础路径: `http://{host}:3000/api`
- 认证方式: `Authorization: Bearer {token}`
- 响应格式: `{ code: 200, message: "success", data: {...} }`
- 错误格式: `{ code: 4xx/5xx, message: "错误描述", data: null }`

---

## 1. 管理后台认证

### 1.1 管理员登录
```
POST /admin/auth/login  (公开)
Body: { username: string, password: string }
Response: { token: string, user: { id, username, nickname, isSuperAdmin } }
```

### 1.2 获取当前管理员信息
```
GET /admin/auth/profile  (需登录)
Response: { id, username, nickname, isSuperAdmin, roleId, status, ... }
```

---

## 2. 系统管理 (权限: system:admin)

### 2.1 账号管理
```
GET    /admin/system/users          # 管理员账号列表
POST   /admin/system/users          # 创建账号 { username, password, nickname?, roleId? }
PUT    /admin/system/users/:id      # 更新账号
DELETE /admin/system/users/:id      # 删除账号
```

### 2.2 角色管理
```
GET    /admin/system/roles          # 角色列表 (含 permissions 字段)
POST   /admin/system/roles          # 创建角色 { name, code, description?, permissions?: string[] }
PUT    /admin/system/roles/:id      # 更新角色
DELETE /admin/system/roles/:id      # 删除角色
```

### 2.3 日志管理
```
GET /admin/system/logs/login        # 登录日志
GET /admin/system/logs/operation    # 操作日志
```

---

## 3. 用户管理 (权限: user:manage)

```
GET /admin/users                    # 小程序用户列表 (分页: ?page=1&pageSize=10)
PUT /admin/users/:id/blacklist      # 设置/取消黑名单 { isBlacklisted: boolean, blacklistUntil?: string }
PUT /admin/users/:id/verifier       # 设置/取消核销员 ?isVerifier=true
PUT /admin/users/:id/promoter       # 设置/取消推广员 ?isPromoter=true
GET /admin/blacklist                # 黑名单列表
```

---

## 4. 内容管理 (权限: content:manage)

### 4.1 展厅 (公开API供小程序调用)
```
GET  /exhibitions                   # 展厅列表
GET  /exhibitions/:id               # 展厅详情（含 richContent）
POST /admin/exhibitions             # 创建展厅
PUT  /admin/exhibitions/:id         # 更新展厅
DELETE /admin/exhibitions/:id       # 删除展厅
```

### 4.2 活动
```
GET  /activities                    # 活动列表
GET  /activities/:id                # 活动详情
POST /admin/activities              # 创建活动
PUT  /admin/activities/:id          # 更新活动
DELETE /admin/activities/:id        # 删除活动
```

### 4.3 Banner
```
GET  /banners                       # Banner列表
POST /admin/banners                 # 创建Banner
PUT  /admin/banners/:id             # 更新Banner
DELETE /admin/banners/:id           # 删除Banner
```

### 4.4 FAQ
```
GET  /faqs                          # 常见问题列表
POST /admin/faqs                    # 创建FAQ
PUT  /admin/faqs/:id                # 更新FAQ
DELETE /admin/faqs/:id              # 删除FAQ
```

---

## 5. 预约管理

### 5.1 用户端 (需登录)
```
GET  /reservations/available-dates       # 可预约日期列表 (公开)
GET  /reservations/my                     # 我的预约列表
GET  /reservations/:id                    # 预约详情
POST /reservations/personal               # 提交个人预约
POST /reservations/team                   # 提交团队预约
PUT  /reservations/:id/cancel             # 取消预约 { reason: string }
```

### 5.2 管理端
```
GET /admin/reservations                   # 预约记录列表 ?page=1&pageSize=10&status=&type=
GET /admin/reservations/pending-review    # 待审核团队预约
GET /admin/reservations/:id               # 预约详情（含参观人、团队信息）
PUT /admin/reservations/:id/approve       # 审核通过
PUT /admin/reservations/:id/reject        # 驳回 { reason: string }
```

---

## 6. 预约配置 (权限: config:manage)

### 6.1 日期与配额
```
GET    /admin/config/dates            # 日期配置列表
POST   /admin/config/dates            # 创建日期 { date, amPersonalQuota?, pmPersonalQuota?, ... }
PUT    /admin/config/dates/:id        # 更新日期
DELETE /admin/config/dates/:id        # 删除日期
GET    /admin/config/quotas           # 配额列表
PUT    /admin/config/quotas/:id       # 更新配额
```

### 6.2 其他配置
```
GET  /config/templates/active                 # 获取有效申请表模板 (公开)
GET  /admin/config/templates                  # 模板列表
POST /admin/config/templates                  # 上传模板
PUT  /admin/config/templates/:id              # 更新模板
DELETE /admin/config/templates/:id            # 删除模板

GET  /notices/:type                           # 预约须知 (公开, type=PERSONAL|TEAM)
PUT  /admin/config/notices/:type              # 更新须知

GET  /admin/config/frequency-limits           # 次数限制列表
POST /admin/config/frequency-limits           # 创建限制
PUT  /admin/config/frequency-limits/:id       # 更新限制

GET  /admin/config/require-real-name          # 实名开关状态
PUT  /admin/config/require-real-name          # 更新实名开关
```

---

## 7. 微信登录

```
POST /wechat/login              # 微信登录 { code: string }  (公开)
POST /wechat/decode-userinfo    # 解密用户信息
```

---

## 8. 核销 (需 isVerifier 权限)

```
POST /verification/scan          # 扫码核销 { qrCode: string }
POST /verification/confirm       # 确认核销 { reservationId: number }
GET  /verification/records       # 核销记录 ?page=1&pageSize=20&date=
GET  /verification/stats         # 核销统计
```

核销扫码响应示例:
```json
{
  "reservationId": 1,
  "reservationNo": "YST20260516001",
  "sessionType": "AM",
  "visitorCount": 3,
  "visitors": [{ "name": "张三", "idCard": "440***********1234" }],
  "status": "APPROVED"
}
```

---

## 9. 推广管理

### 9.1 用户端
```
GET  /promotion/stats           # 推广统计
GET  /promotion/records         # 推广记录
POST /promotion/apply           # 申请推广员
POST /promotion/apply-by-token  # 通过邀请码申请
POST /promotion/click           # 记录推广点击 (公开)
```

### 9.2 管理端 (权限: promotion:manage)
```
GET  /admin/promoters                          # 推广员列表
PUT  /admin/promoters/:userId/disable          # 禁用推广员
GET  /admin/promoters/applications             # 推广员申请列表
POST /admin/promoters/generate-qr              # 生成推广二维码
POST /admin/promoters/applications             # 创建推广申请
PUT  /admin/promoters/applications/:id/approve # 通过申请
PUT  /admin/promoters/applications/:id/reject  # 驳回申请
```

---

## 10. 实名认证

```
GET    /real-names              # 实名列表
POST   /real-names/verify       # 姓名+身份证号二要素核验
GET    /real-names/:id          # 实名详情
POST   /real-names              # 新增实名
PUT    /real-names/:id          # 更新实名
DELETE /real-names/:id          # 软删除实名
```

---

## 11. 通知

```
GET  /notifications              # 通知列表
GET  /notifications/unread-count # 未读数量
PUT  /notifications/:id/read     # 标记已读
PUT  /notifications/read-all     # 全部已读
```

---

## 12. 反馈

```
POST /feedback                    # 提交反馈 (公开) { content, contact?, images? }
GET  /admin/feedbacks             # 反馈列表 (权限: feedback:view)
```

---

## 13. DIY 页面

```
GET  /diy-page/active             # 获取发布中的首页配置 (公开)
GET  /diy-page                    # DIY页面列表 (权限: diy:manage)
GET  /diy-page/:id                # 页面详情
POST /diy-page                    # 创建页面
PUT  /diy-page/:id                # 保存页面
PUT  /diy-page/:id/publish        # 发布页面
DELETE /diy-page/:id              # 删除页面
```

---

## 14. 文件上传

```
POST /files/upload                # 上传文件 (multipart/form-data, field: file)
Response: { url: "/uploads/xxx" }
```

---

## 15. 地区数据

```
GET /regions/provinces            # 省份列表 (公开)
GET /regions/cities               # 城市列表 ?province=省份名 (公开)
```

---

## 16. 统计 (需登录)

```
GET /admin/statistics/overview        # 概览统计
GET /admin/statistics/weekly-trend    # 周趋势
GET /admin/statistics/age-distribution # 年龄分布
GET /admin/statistics/popular-dates   # 热门日期
GET /admin/statistics/daily-quota     # 每日配额
GET /admin/statistics/reservation-stats # 预约统计
```

---

## 17. 权限码对照

| 权限码 | 对应接口 |
|---|---|
| `reservation:review` | 预约审核 (approve/reject) |
| `user:manage` | 用户管理 (users CRUD/blacklist/verifier) |
| `system:admin` | 系统管理 (admin users/roles/logs) |
| `config:manage` | 配置管理 (dates/quotas/notices/templates) |
| `content:manage` | 内容管理 (exhibitions/activities/banners/faqs) |
| `diy:manage` | DIY页面管理 |
| `promotion:manage` | 推广员管理 |
| `feedback:view` | 反馈查看 |
| (无权限) | 仅可查看预约记录和统计数据 |
