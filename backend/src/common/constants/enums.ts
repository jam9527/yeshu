/**
 * 状态枚举常量
 * 集中管理所有枚举值，避免魔法字符串
 */

// 预约类型
export const RESERVATION_TYPE = {
  PERSONAL: 'PERSONAL', // 个人预约
  TEAM: 'TEAM',         // 团队预约
} as const;
export type ReservationType = (typeof RESERVATION_TYPE)[keyof typeof RESERVATION_TYPE];

// 场次类型
export const SESSION_TYPE = {
  AM: 'AM',   // 上午场
  PM: 'PM',   // 下午场
  EV: 'EV',   // 夜场
} as const;
export type SessionType = (typeof SESSION_TYPE)[keyof typeof SESSION_TYPE];

// 预约状态
export const RESERVATION_STATUS = {
  PENDING: 'PENDING',         // 待核销（个人预约默认）
  APPROVING: 'APPROVING',     // 审批中（团队预约默认）
  APPROVED: 'APPROVED',       // 审批通过（团队预约审核通过后）
  VERIFIED: 'VERIFIED',       // 已使用/已核销
  CANCELLED: 'CANCELLED',     // 已取消
  EXPIRED: 'EXPIRED',         // 已过期（未核销且已过预约日期）
  REJECTED: 'REJECTED',       // 已拒绝（团队预约审核驳回）
} as const;
export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

// 频率限制周期
export const FREQUENCY_PERIOD = {
  WEEKLY: 'WEEKLY',     // 每周
  MONTHLY: 'MONTHLY',   // 每月
  YEARLY: 'YEARLY',     // 每年
  TOTAL: 'TOTAL',       // 总共
} as const;

// 核销结果
export const VERIFY_RESULT = {
  SUCCESS: 'SUCCESS',         // 核销成功
  FAILED: 'FAILED',           // 核销失败
  DUPLICATE: 'DUPLICATE',     // 重复核销
  EXPIRED: 'EXPIRED',         // 已过期
} as const;

// 活动状态
export const ACTIVITY_STATUS = {
  UPCOMING: 'UPCOMING', // 即将开始
  ONGOING: 'ONGOING',   // 进行中
  ENDED: 'ENDED',       // 已结束
} as const;

// 反馈状态
export const FEEDBACK_STATUS = {
  PENDING: 'PENDING',   // 待处理
  RESOLVED: 'RESOLVED', // 已处理
} as const;

/**
 * 统计口径：有效预约 = 待核销 / 已通过 / 已核销 / 爽约过期
 *
 * 含 EXPIRED 是为了让历史日期的预约数保持稳定：爽约只是没到场，不算取消，应计入预约。
 * 每天凌晨的过期任务会把"日期已过且未核销"的预约从 PENDING/APPROVED 改成 EXPIRED
 * （见 queue/tasks.processor.ts），若此处不含 EXPIRED，历史区间的分母就只剩已核销的预约，
 * 核销率会恒等于 100%。
 *
 * 与"实时剩余名额"（不含过期，过期会回退配额）刻意不同口径。
 * 注意：团队 APPROVING（待审核）不在内，单独作为"待审核"指标。
 */
export const VALID_RESERVATION_STATUSES: string[] = ['PENDING', 'APPROVED', 'VERIFIED', 'EXPIRED'];
