import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 常见问题表 */
@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 255, comment: '问题' })
  question: string;

  @Column({ type: 'longtext', comment: '答案（支持富文本）' })
  answer: string;

  @Column({ default: 0, comment: '排序号' })
  sortOrder: number;

  @Column({ default: true, comment: '是否发布' })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
