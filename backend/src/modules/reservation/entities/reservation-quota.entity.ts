import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique
} from 'typeorm';
import { ReservationDateConfig } from './reservation-date-config.entity';

/**
 * 预约实时配额表
 * 每日期+每场次一条记录，version 字段用于乐观锁防止超售
 */
@Entity('reservation_quota')
@Unique(['dateConfigId', 'sessionType'])
export class ReservationQuota {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  dateConfigId: number;

  @ManyToOne(() => ReservationDateConfig)
  @JoinColumn({ name: 'date_config_id' })
  dateConfig: ReservationDateConfig;

  @Column({ length: 10, comment: '场次: AM=上午 PM=下午' })
  sessionType: string;

  @Column({ default: 0, comment: '个人总名额' })
  totalPersonal: number;

  @Column({ default: 0, comment: '已使用个人名额' })
  usedPersonal: number;

  @Column({ default: 0, comment: '团队总名额' })
  totalTeam: number;

  @Column({ default: 0, comment: '已使用团队名额' })
  usedTeam: number;

  @Column({ default: 0, comment: '乐观锁版本号，每次更新+1' })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
