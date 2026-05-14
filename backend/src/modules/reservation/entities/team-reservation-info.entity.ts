import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Reservation } from './reservation.entity';

/** 团队预约附加信息表 - 团队预约特有的字段 */
@Entity('team_reservation_info')
export class TeamReservationInfo {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, unique: true })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ length: 32, comment: '联系人姓名' })
  contactName: string;

  @Column({ length: 20, comment: '联系人手机号' })
  contactPhone: string;

  @Column({ length: 32, default: 'ID_CARD', comment: '证件类型' })
  idCardType: string;

  @Column({ length: 18, nullable: true, comment: '联系人证件号' })
  contactIdCard: string;

  @Column({ length: 32, comment: '团队类型' })
  teamType: string;

  @Column({ length: 128, comment: '单位全称' })
  orgName: string;

  @Column({ length: 32, nullable: true, comment: '统一社会信用代码' })
  orgCode: string;

  @Column({ length: 512, nullable: true, comment: '预约申请表文件 URL' })
  applicationFile: string;

  @Column({ type: 'text', nullable: true, comment: '附件文件列表（JSON 数组）' })
  attachmentFiles: string;

  @CreateDateColumn()
  createdAt: Date;
}
