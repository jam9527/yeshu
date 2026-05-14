import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index
} from 'typeorm';

/**
 * 微信小程序用户表
 * 存储通过微信登录的用户信息
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 64, unique: true, comment: '微信 openid' })
  openid: string;

  @Column({ length: 128, nullable: true, comment: '微信 session_key（加密存储）' })
  sessionKey: string;

  @Column({ length: 64, nullable: true, comment: '微信昵称' })
  nickname: string;

  @Column({ length: 512, nullable: true, comment: '微信头像 URL' })
  avatarUrl: string;

  @Index()
  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone: string;

  @Column({ default: false, comment: '是否为核销员' })
  isVerifier: boolean;

  @Column({ default: false, comment: '是否为推广员' })
  isPromoter: boolean;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '推广人用户ID' })
  promotedBy: number;

  @Column({ default: false, comment: '是否在黑名单中' })
  isBlacklisted: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '黑名单到期时间' })
  blacklistUntil: Date;

  @Column({ default: 0, comment: '累计过期次数（满3次自动拉黑90天）' })
  noShowCount: number;

  @Column({ type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt: Date;

  @Column({ default: 1, comment: '状态: 1=正常 0=禁用' })
  status: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
