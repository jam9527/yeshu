import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';

/**
 * 可预约日期配置表
 * 后台按月设置哪些日期可预约，以及每场的具体时间段和名额
 */
@Entity('reservation_date_config')
export class ReservationDateConfig {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'date', unique: true, comment: '可预约日期' })
  date: string;

  @Column({ default: true, comment: '是否开放预约' })
  isAvailable: boolean;

  @Column({ type: 'time', default: '09:00:00', comment: '上午场开始时间' })
  morningStart: string;

  @Column({ type: 'time', default: '12:00:00', comment: '上午场结束时间' })
  morningEnd: string;

  @Column({ type: 'time', default: '14:00:00', comment: '下午场开始时间' })
  afternoonStart: string;

  @Column({ type: 'time', default: '17:00:00', comment: '下午场结束时间' })
  afternoonEnd: string;

  @Column({ default: 500, comment: '上午场个人名额' })
  amPersonalQuota: number;

  @Column({ default: 200, comment: '上午场团队名额' })
  amTeamQuota: number;

  @Column({ default: 500, comment: '下午场个人名额' })
  pmPersonalQuota: number;

  @Column({ default: 200, comment: '下午场团队名额' })
  pmTeamQuota: number;

  @Column({ length: 255, nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
