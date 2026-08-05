import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * 实名信息表
 * 用户保存的常用参观人信息，支持快捷添加
 * 软删除（is_deleted），保留历史记录
 */
@Entity('real_name_info')
export class RealNameInfo {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 32, comment: '姓名' })
  name: string;

  @Index()
  @Column({ length: 30, comment: '证件号码（支持身份证/护照/港澳台通行证）' })
  idCard: string;

  @Column({ length: 20, default: 'ID_CARD', comment: '证件类型: ID_CARD/PASSPORT/HK_MO_TW' })
  idCardType: string;

  @Column({ length: 32, nullable: true, comment: '省份' })
  province: string;

  @Column({ length: 32, nullable: true, comment: '城市' })
  city: string;

  @Column({ default: false, comment: '是否已通过实名核验（GB 11643-1999国标校验）' })
  idVerified: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '核验时间' })
  verifyTime: Date;

  @Column({ default: false, comment: '软删除标记' })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
