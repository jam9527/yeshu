import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Banner 轮播图表 */
@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 128, nullable: true, comment: '标题' })
  title: string;

  @Column({ length: 512, comment: '图片 URL' })
  imageUrl: string;

  @Column({ length: 20, default: 'NONE', comment: '跳转类型: NONE/URL/PAGE' })
  linkType: string;

  @Column({ length: 512, nullable: true, comment: '跳转值' })
  linkValue: string;

  @Column({ default: 0, comment: '排序号' })
  sortOrder: number;

  @Column({ default: true, comment: '是否发布' })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
