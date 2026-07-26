# 椰树集团参观预约系统 — 数据库设计文档

## 概述

- 数据库: MySQL 8.0
- 数据库名: `yeshu_reservation`
- 字符集: `utf8mb4`
- 时区: `+08:00`
- ORM: TypeORM 0.3.x (开发环境自动同步表结构)
- 表数量: 26 张

---

## 1. 核心业务表

### 1.1 users — 小程序用户表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK, AUTO_INCREMENT | 用户ID |
| openid | varchar(64) | UNIQUE, NOT NULL | 微信openid |
| sessionKey | varchar(128) | nullable | 微信session_key |
| nickname | varchar(64) | nullable | 微信昵称 |
| avatarUrl | varchar(512) | nullable | 头像URL |
| phone | varchar(20) | INDEX, nullable | 手机号 |
| isVerifier | boolean | default false | 是否为核销员 |
| isPromoter | boolean | default false | 是否为推广员 |
| promotedBy | bigint unsigned | nullable | 推广人用户ID |
| isBlacklisted | boolean | default false | 是否在黑名单 |
| blacklistUntil | datetime | nullable | 黑名单到期时间 |
| noShowCount | int | default 0 | 累计过期/爽约次数 |
| lastLoginAt | datetime | nullable | 最后登录时间 |
| status | int | default 1 | 状态: 1=正常 0=禁用 |
| createdAt | datetime | auto | 创建时间 |
| updatedAt | datetime | auto | 更新时间 |

### 1.2 admin_users — 管理后台用户表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | 管理员ID |
| username | varchar(64) | UNIQUE | 登录用户名 |
| passwordHash | varchar(128) | NOT NULL | bcrypt 密码哈希 |
| nickname | varchar(64) | nullable | 显示名称 |
| roleId | bigint unsigned | nullable, FK→admin_roles | 角色ID |
| isSuperAdmin | boolean | default false | 是否超级管理员 |
| status | int | default 1 | 状态: 1=正常 0=禁用 |
| lastLoginAt | datetime | nullable | 最后登录时间 |
| lastLoginIp | varchar(64) | nullable | 最后登录IP |
| createdAt | datetime | auto | 创建时间 |
| updatedAt | datetime | auto | 更新时间 |

### 1.3 admin_roles — 管理后台角色表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | 角色ID |
| name | varchar(64) | UNIQUE | 角色名称 |
| code | varchar(64) | UNIQUE | 角色编码 |
| description | varchar(255) | nullable | 角色描述 |
| permissions | json | NOT NULL | 权限列表 JSON 数组 |
| status | int | default 1 | 状态 |
| createdAt | datetime | auto | 创建时间 |
| updatedAt | datetime | auto | 更新时间 |

permissions 字段示例:
```json
["user:manage", "reservation:review", "content:manage"]
```

---

## 2. 预约核心表

### 2.1 reservations — 预约主表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | 预约ID |
| reservationNo | varchar(32) | UNIQUE | 业务编号 YST+日期+随机 |
| userId | bigint unsigned | FK→users | 预约用户ID |
| type | varchar(10) | NOT NULL | PERSONAL / TEAM |
| sessionType | varchar(10) | NOT NULL | AM / PM |
| reservationDate | date | NOT NULL | 预约日期 |
| dateConfigId | bigint | | 日期配置ID |
| visitorCount | int | | 参观人数 |
| status | varchar(20) | | 见状态说明 |
| qrCode | varchar(512) | | md5核销码 |
| qrCodeExpireAt | datetime | nullable | 核销码过期时间 |
| cancelReason | varchar(255) | nullable | 取消原因 |
| cancelTime | datetime | nullable | 取消时间 |
| rejectReason | varchar(255) | nullable | 驳回原因 |
| rejectTime | datetime | nullable | 驳回时间 |
| verifierId | bigint | nullable | 核销员ID |
| verifyTime | datetime | nullable | 核销时间 |
| promoterId | bigint | nullable | 推广员ID |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

状态枚举:
| status | 说明 |
|---|---|
| PENDING | 待核销（个人预约提交后） |
| APPROVING | 审批中（团队预约提交后） |
| APPROVED | 已通过（团队预约审核通过） |
| VERIFIED | 已使用（核销完成） |
| CANCELLED | 已取消 |
| REJECTED | 已拒绝 |
| EXPIRED | 已过期 |

### 2.2 reservation_visitors — 参观人表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | |
| reservationId | bigint | FK→reservations | 所属预约 |
| realNameId | bigint | nullable | 关联实名信息 |
| name | varchar(32) | | 姓名 |
| idCard | varchar(18) | INDEX | 身份证号 |
| province | varchar(32) | | 省份 |
| city | varchar(32) | | 城市 |
| idVerified | boolean | default false | 实名是否已验证 |
| createdAt | datetime | auto | |

### 2.3 team_reservation_info — 团队预约附加信息

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | |
| reservationId | bigint | UNIQUE FK→reservations | 关联预约 |
| contactName | varchar(32) | | 联系人 |
| contactPhone | varchar(20) | | 联系电话 |
| idCardType | varchar(32) | default ID_CARD | 证件类型 |
| contactIdCard | varchar(18) | nullable | 证件号 |
| teamType | varchar(32) | | 团队类型 |
| orgName | varchar(128) | | 单位名称 |
| orgCode | varchar(32) | nullable | 统一社会信用代码 |
| applicationFile | varchar(512) | nullable | 申请表文件 |
| attachmentFiles | text | nullable | 附件 JSON 数组 |
| createdAt | datetime | auto | |

### 2.4 reservation_date_config — 日期配置表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | |
| date | date | UNIQUE | 可预约日期 |
| isAvailable | boolean | default true | 是否开放 |
| morningStart | time | default 09:00 | |
| morningEnd | time | default 12:00 | |
| afternoonStart | time | default 14:00 | |
| afternoonEnd | time | default 17:00 | |
| amPersonalQuota | int | default 500 | 上午个人配额 |
| amTeamQuota | int | default 200 | 上午团队配额 |
| pmPersonalQuota | int | default 500 | 下午个人配额 |
| pmTeamQuota | int | default 200 | 下午团队配额 |
| remark | varchar(255) | nullable | 备注 |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

### 2.5 reservation_quota — 配额使用量表

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint unsigned | PK | |
| dateConfigId | bigint | FK | 关联日期配置 |
| sessionType | varchar(10) | | AM / PM |
| totalPersonal | int | | 个人总配额 |
| usedPersonal | int | | 个人已用 |
| totalTeam | int | | 团队总配额 |
| usedTeam | int | | 团队已用 |
| version | int | default 0 | 乐观锁版本号 |
| createdAt | datetime | auto | |
| updatedAt | datetime | auto | |

---

## 3. 内容管理表

### 3.1 exhibitions — 展厅表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| name | varchar | 展厅名称 |
| coverImage | varchar | 封面图URL |
| description | text nullable | 简介 |
| richContent | text nullable | 富文本HTML |
| sortOrder | int default 0 | 排序 |
| isPublished | boolean default true | 发布状态 |
| createdAt / updatedAt | datetime | |

### 3.2 activities — 活动表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| title | varchar | 活动标题 |
| coverImage | varchar | 封面图 |
| location | varchar | 地点 |
| startTime | datetime | 开始时间 |
| endTime | datetime | 结束时间 |
| status | varchar | ONGOING / UPCOMING / ENDED |
| richContent | text nullable | 富文本详情 |
| summary | text nullable | 摘要 |
| sortOrder | int default 0 | 排序 |
| isPublished | boolean | 发布状态 |
| createdAt / updatedAt | datetime | |

### 3.3 banners — Banner表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| title | varchar | 标题 |
| imageUrl | varchar | 图片URL |
| linkType | varchar | NONE / EXHIBITION / ACTIVITY / URL |
| linkValue | varchar nullable | 链接值 |
| sortOrder | int | 排序 |
| isPublished | boolean | 发布状态 |

### 3.4 faqs — 常见问题表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| question | text | 问题 |
| answer | text | 答案 |
| sortOrder | int | 排序 |
| isPublished | boolean | 发布状态 |

---

## 4. 配置管理表

### 4.1 reservation_notices — 预约须知

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| type | varchar(16) UNIQUE | PERSONAL / TEAM |
| content | text | 须知内容(HTML) |
| updatedBy | bigint nullable | 更新人 |
| updatedAt | datetime | |

### 4.2 reservation_templates — 申请表模板

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| name | varchar | 模板名称 |
| fileUrl | varchar | 文件URL |
| isActive | boolean | 是否激活 |
| uploadedBy | bigint nullable | |
| createdAt / updatedAt | datetime | |

### 4.3 frequency_limits — 预约频率限制

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| type | varchar(16) | PERSONAL / TEAM |
| period | varchar(16) | DAY / WEEK / MONTH |
| maxCount | int | 最大次数 |
| enabled | boolean | 是否启用 |

### 4.4 system_config — 系统配置

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| configKey | varchar(64) UNIQUE | 配置键 |
| configValue | text | 配置值 |
| description | varchar(255) nullable | 说明 |

目前已使用的 configKey:
| key | 说明 |
|---|---|
| requireRealName | 个人预约是否需要实名核验 (true/false) |
| loginPage | 登录页自定义配置 JSON: {background,logo,titleColor,buttonColor,buttonTextColor} |

---

## 5. 核销与推广表

### 5.1 verification_records — 核销记录

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| reservationId | bigint FK→reservations | 预约ID |
| verifierId | bigint | 核销员ID |
| qrCode | varchar(512) | 核销码 |
| verifyResult | varchar | SUCCESS / FAIL |
| failReason | varchar nullable | 失败原因 |
| verifiedAt | datetime | 核销时间 |

### 5.2 promotion_records — 推广记录

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| promoterId | bigint | 推广员ID |
| visitorUserId | bigint nullable | 访问用户ID |
| visitorOpenid | varchar nullable | 访问用户openid |
| reservationId | bigint nullable | 关联预约ID |
| verified | boolean default false | 是否已核销 |
| clickedAt | datetime | 点击时间 |

### 5.3 promoter_applications — 推广员申请

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| userId | bigint FK | 申请人ID |
| token | varchar UNIQUE nullable | 邀请码 |
| status | varchar | PENDING / APPROVED / REJECTED |
| approvedBy | bigint nullable | 审批人 |
| remark | varchar nullable | 备注 |

### 5.4 promotion_posters — 推广海报模板

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint unsigned PK | |
| name | varchar(100) | 海报名称（管理后台标识） |
| backgroundUrl | varchar(500) | 背景图路径 (/uploads/...) |
| textConfig | text | 文字层 JSON: [{content,x,y,fontSize,color,fontWeight,textAlign}] |
| qrConfig | text | 二维码配置 JSON: {x,y,size} |
| isActive | boolean default false | 是否启用（全局仅一张） |
| createdAt | datetime | |
| updatedAt | datetime | |

---

## 6. 其他表

### 6.1 real_name_info — 实名信息

| 关键字段 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | |
| userId | bigint FK | 用户ID |
| name / idCard / idCardType | varchar | 身份信息 |
| province / city | varchar | 地区 |
| idVerified | boolean | 验证状态 |
| isDeleted | boolean | 软删除标记 |

### 6.2 notifications — 通知消息

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | |
| userId | bigint | 接收用户 |
| type | varchar | 通知类型 |
| title / content | varchar/text | 通知内容 |
| isRead | boolean | 已读状态 |
| relatedId | bigint nullable | 关联业务ID |

### 6.3 feedbacks — 用户反馈

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | |
| userId | bigint | 用户ID |
| content | text | 反馈内容 |
| contact | varchar nullable | 联系方式 |
| images | text nullable | 图片JSON |
| status | varchar | PENDING / REPLIED |
| adminReply | text nullable | 管理员回复 |

### 6.4 diy_pages — DIY首页配置

| 字段 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | |
| pageKey | varchar | 页面标识 |
| name | varchar | 名称 |
| config | json | 页面配置JSON |
| isActive | boolean | 激活状态 |
| version | int | 版本号 |

### 6.5 admin_login_logs / admin_operation_logs — 审计日志

登录日志: adminUserId, username, ip, loginResult, failReason, loginAt
操作日志: adminUserId, action, module, resourceId, detail(JSON), ip, createdAt

---

## 7. ER 关系概要

```
admin_roles ──┐
              ├── admin_users ──── admin_login_logs
              │                    ├── admin_operation_logs
users ────────┤
  │           └── promoter_applications
  ├── reservations ─── reservation_visitors
  │     └── team_reservation_info
  ├── verification_records
  ├── promotion_records
  ├── real_name_info
  ├── notifications
  └── feedbacks

reservation_date_config ─── reservation_quota

独立表: exhibitions, activities, banners, faqs,
       reservation_notices, reservation_templates,
       frequency_limits, system_config, diy_pages,
       promotion_posters
```
