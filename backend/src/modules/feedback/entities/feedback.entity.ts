import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** 用户反馈表 */
@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  userId: number;

  @Column({ type: 'text', comment: '反馈内容' })
  content: string;

  @Column({ length: 64, nullable: true, comment: '联系方式' })
  contact: string;

  @Column({ type: 'text', nullable: true, comment: '图片 URL 列表（JSON 数组）' })
  images: string;

  @Column({ length: 20, default: 'PENDING', comment: '状态: PENDING/RESOLVED' })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '管理员回复' })
  adminReply: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
