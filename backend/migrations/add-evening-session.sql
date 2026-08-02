-- ============================================================
-- 添加夜场（19:00-21:00）支持
-- 在 reservation_date_config 表中新增夜场相关字段
-- ============================================================

ALTER TABLE `reservation_date_config`
  ADD COLUMN `eveningStart` TIME DEFAULT '19:00:00' COMMENT '夜场开始时间' AFTER `pmTeamQuota`,
  ADD COLUMN `eveningEnd` TIME DEFAULT '21:00:00' COMMENT '夜场结束时间' AFTER `eveningStart`,
  ADD COLUMN `evPersonalQuota` INT DEFAULT 500 COMMENT '夜场个人名额' AFTER `eveningEnd`,
  ADD COLUMN `evTeamQuota` INT DEFAULT 200 COMMENT '夜场团队名额' AFTER `evPersonalQuota`;

-- 为已有的日期配置创建夜场配额记录
INSERT INTO `reservation_quota` (`dateConfigId`, `sessionType`, `totalPersonal`, `totalTeam`, `usedPersonal`, `usedTeam`, `version`, `createdAt`, `updatedAt`)
SELECT
  dc.id,
  'EV',
  dc.evPersonalQuota,
  dc.evTeamQuota,
  0, 0, 0,
  NOW(), NOW()
FROM `reservation_date_config` dc
LEFT JOIN `reservation_quota` q ON q.dateConfigId = dc.id AND q.sessionType = 'EV'
WHERE q.id IS NULL;
