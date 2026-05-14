import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('promoter_applications')
export class PromoterApplication {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true, comment: '申请人用户ID' })
  userId: number;

  @Column({ length: 64, unique: true, nullable: true, comment: '二维码邀请Token' })
  token: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 20, default: 'PENDING', comment: 'PENDING | APPROVED | REJECTED' })
  status: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '审核人管理用户ID' })
  approvedBy: number;

  @Column({ length: 255, nullable: true, comment: '备注/驳回原因' })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
