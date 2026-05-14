import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

/** 预约须知配置表 - 个人/团队各一条记录 */
@Entity('reservation_notices')
export class NoticeConfig {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 20, unique: true, comment: '类型: PERSONAL/TEAM' })
  type: string;

  @Column({ type: 'longtext', comment: '须知内容（富文本）' })
  content: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '最后编辑的管理员ID' })
  updatedBy: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
