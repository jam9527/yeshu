import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

/** 预约频率限制配置表 - 控制用户每周/月/年/总共可预约次数 */
@Entity('frequency_limits')
@Unique(['type', 'period'])
export class FrequencyLimit {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20, comment: '预约类型: PERSONAL/TEAM' })
  type: string;

  @Column({ length: 20, comment: '周期: WEEKLY/MONTHLY/YEARLY/TOTAL' })
  period: string;

  @Column({ comment: '次数上限（0=不限制）' })
  maxCount: number;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
