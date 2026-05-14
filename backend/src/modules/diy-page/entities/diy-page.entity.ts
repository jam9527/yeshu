import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * DIY 页面配置
 * 存储页面组件布局和数据，JSON 格式灵活扩展
 */
@Entity('diy_pages')
export class DiyPage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 50, comment: '页面标识: home / custom' })
  pageKey: string;

  @Column({ length: 100, comment: '页面名称' })
  name: string;

  @Column({ type: 'json', comment: '组件配置 JSON' })
  config: object;

  @Column({ default: false, comment: '是否启用' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: '版本号' })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
