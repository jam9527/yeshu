import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 展厅表 */
@Entity('exhibitions')
export class Exhibition {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 128, comment: '展厅名称' })
  name: string;

  @Column({ length: 512, nullable: true, comment: '头图 URL' })
  coverImage: string;

  @Column({ type: 'text', nullable: true, comment: '简介' })
  description: string;

  @Column({ type: 'longtext', nullable: true, comment: '富文本详细介绍' })
  richContent: string;

  @Column({ default: 0, comment: '排序号' })
  sortOrder: number;

  @Column({ default: true, comment: '是否发布' })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
