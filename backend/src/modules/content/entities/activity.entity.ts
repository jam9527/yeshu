import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 活动表 */
@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 128, comment: '活动标题' })
  title: string;

  @Column({ length: 512, nullable: true, comment: '活动头图' })
  coverImage: string;

  @Column({ length: 255, nullable: true, comment: '活动地点' })
  location: string;

  @Column({ type: 'datetime', nullable: true, comment: '开始时间' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true, comment: '结束时间' })
  endTime: Date;

  @Column({ length: 20, default: 'UPCOMING', comment: '状态: UPCOMING/ONGOING/ENDED' })
  status: string;

  @Column({ type: 'longtext', nullable: true, comment: '富文本详细介绍' })
  richContent: string;

  @Column({ type: 'text', nullable: true, comment: '摘要（列表展示用）' })
  summary: string;

  @Column({ default: 0, comment: '排序号' })
  sortOrder: number;

  @Column({ default: true, comment: '是否发布' })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
