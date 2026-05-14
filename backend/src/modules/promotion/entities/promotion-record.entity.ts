import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** 推广记录表 */
@Entity('promotion_records')
export class PromotionRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true, comment: '推广员用户ID' })
  promoterId: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '被推广人用户ID（注册后绑定）' })
  visitorUserId: number;

  @Column({ length: 64, nullable: true, comment: '访客 openid（未注册时记录）' })
  visitorOpenid: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '通过推广产生的预约ID' })
  reservationId: number;

  @Column({ default: false, comment: '该推广预约是否已核销' })
  verified: boolean;

  @Column({ type: 'datetime', comment: '点击/分享时间' })
  clickedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
