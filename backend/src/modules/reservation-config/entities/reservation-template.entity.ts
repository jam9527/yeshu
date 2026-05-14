import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 预约申请表模板表 */
@Entity('reservation_templates')
export class ReservationTemplate {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 128, comment: '模板名称' })
  name: string;

  @Column({ length: 512, comment: '文件 URL' })
  fileUrl: string;

  @Column({ default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '上传的管理员ID' })
  uploadedBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
