import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Reservation } from '../../reservation/entities/reservation.entity';

/** 核销记录表 */
@Entity('verification_records')
export class VerificationRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ type: 'bigint', unsigned: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @Column({ type: 'bigint', unsigned: true, comment: '核销人员用户ID' })
  verifierId: number;

  @Column({ length: 512, comment: '扫码时的二维码内容' })
  qrCode: string;

  @Column({ length: 20, default: 'SUCCESS', comment: '核销结果: SUCCESS/FAILED/DUPLICATE/EXPIRED' })
  verifyResult: string;

  @Column({ length: 255, nullable: true, comment: '失败原因' })
  failReason: string;

  @Column({ default: 0, comment: '实际到场人数' })
  actualCount: number;

  @Column({ type: 'datetime', comment: '核销时间' })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
