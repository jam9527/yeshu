import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Reservation } from './reservation.entity';

/** 参观人明细表 - 个人预约的每位参观人信息 */
@Entity('reservation_visitors')
export class ReservationVisitor {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '关联的实名信息ID（可空）' })
  realNameId: number;

  @Column({ length: 32, comment: '姓名' })
  name: string;

  @Index()
  @Column({ length: 18, comment: '身份证号' })
  idCard: string;

  @Column({ length: 32, comment: '省份' })
  province: string;

  @Column({ length: 32, comment: '城市' })
  city: string;

  @Column({ default: false, comment: '是否已通过身份证核验' })
  idVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
