import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 管理后台角色表 - permissions 为 JSON 格式存储权限列表 */
@Entity('admin_roles')
export class AdminRole {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 64, unique: true, comment: '角色名称' })
  name: string;

  @Column({ length: 64, unique: true, comment: '角色编码' })
  code: string;

  @Column({ length: 255, nullable: true, comment: '描述' })
  description: string;

  @Column({ type: 'json', comment: '权限列表 JSON' })
  permissions: any;

  @Column({ default: 1, comment: '状态: 1=正常 0=禁用' })
  status: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
