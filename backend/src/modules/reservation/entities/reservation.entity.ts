import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * 预约主表
 * 个人预约和团队预约共用此表，通过 type 字段区分
 * 状态流转:
 *   PERSONAL: PENDING -> VERIFIED / CANCELLED / EXPIRED
 *   TEAM:     APPROVING -> APPROVED -> VERIFIED / CANCELLED / EXPIRED / REJECTED
 */
@Entity('reservations')
@Index(['userId', 'reservationDate'])
@Index(['reservationDate', 'sessionType'])
export class Reservation {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 32, unique: true, comment: '预约编号（业务号，格式: YS+日期+随机）' })
  reservationNo: string;

  @Column({ type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 10, comment: '预约类型: PERSONAL=个人 TEAM=团队' })
  type: string;

  @Column({ length: 10, comment: '场次: AM=上午 PM=下午' })
  sessionType: string;

  @Column({ type: 'date', comment: '预约日期' })
  reservationDate: string;

  @Column({ type: 'bigint', unsigned: true })
  dateConfigId: number;

  @Column({ comment: '参观人数' })
  visitorCount: number;

  @Column({ length: 128, nullable: true, comment: '行政分区（省-市-区）' })
  district: string;

  @Column({ length: 16, nullable: true, comment: '岛内/岛外: ON_ISLAND/OFF_ISLAND' })
  visitorType: string;

  @Column({ default: 0, comment: '12岁以下儿童人数' })
  childrenCount: number;

  @Column({ length: 20, default: 'PENDING', comment: '预约状态' })
  status: string;

  @Column({ length: 512, nullable: true, comment: '核销码（md5 token）' })
  qrCode: string;

  @Column({ type: 'datetime', nullable: true, comment: '核销码过期时间' })
  qrCodeExpireAt: Date;

  @Column({ length: 255, nullable: true, comment: '取消原因' })
  cancelReason: string;

  @Column({ type: 'datetime', nullable: true, comment: '取消时间' })
  cancelTime: Date;

  @Column({ length: 255, nullable: true, comment: '驳回原因' })
  rejectReason: string;

  @Column({ type: 'datetime', nullable: true, comment: '驳回时间' })
  rejectTime: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '核销人员用户ID' })
  verifierId: number;

  @Column({ type: 'datetime', nullable: true, comment: '核销时间' })
  verifyTime: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '推广员用户ID（通过推广海报扫码）' })
  promoterId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
