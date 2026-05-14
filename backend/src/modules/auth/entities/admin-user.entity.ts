import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** 管理后台用户表 */
@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 64, unique: true, comment: '用户名' })
  username: string;

  @Column({ length: 128, comment: '密码哈希（bcrypt）' })
  passwordHash: string;

  @Column({ length: 64, nullable: true, comment: '显示名称' })
  nickname: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '角色ID' })
  roleId: number;

  @Column({ default: false, comment: '是否超级管理员' })
  isSuperAdmin: boolean;

  @Column({ default: 1, comment: '状态: 1=正常 0=禁用' })
  status: number;

  @Column({ type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt: Date;

  @Column({ length: 64, nullable: true, comment: '最后登录IP' })
  lastLoginIp: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
