import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index
} from 'typeorm';

/**
 * 用户通知表
 * 用于存储系统通知、预约审核结果通知等
 */
@Entity('notifications')
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  userId: number;

  @Column({ length: 50, comment: '通知类型: RESERVATION_APPROVED, RESERVATION_REJECTED, SYSTEM' })
  type: string;

  @Column({ length: 200, comment: '通知标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '通知内容' })
  content: string;

  @Column({ default: false, comment: '是否已读' })
  isRead: boolean;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '关联业务ID（如预约ID）' })
  relatedId: number;

  @CreateDateColumn()
  createdAt: Date;
}
