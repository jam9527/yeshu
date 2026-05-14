import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** 管理后台登录日志表 */
@Entity('admin_login_logs')
export class LoginLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '管理员用户ID' })
  adminUserId: number;

  @Column({ length: 64, comment: '登录用户名' })
  username: string;

  @Column({ length: 64, nullable: true, comment: 'IP 地址' })
  ip: string;

  @Column({ length: 20, comment: '登录结果: SUCCESS/FAILED' })
  loginResult: string;

  @Column({ length: 255, nullable: true, comment: '失败原因' })
  failReason: string;

  @CreateDateColumn()
  loginAt: Date;
}
