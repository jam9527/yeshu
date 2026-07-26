import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VerificationRecord } from './entities/verification-record.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { TeamReservationInfo } from '../reservation/entities/team-reservation-info.entity';
import { PromotionService } from '../promotion/promotion.service';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationRecord)
    private readonly recordRepo: Repository<VerificationRecord>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(TeamReservationInfo)
    private readonly teamInfoRepo: Repository<TeamReservationInfo>,
    @Inject(forwardRef(() => PromotionService))
    private readonly promotionService: PromotionService,
  ) {}

  /**
   * 扫码验证 - 校验二维码有效性并返回预约+人员信息
   */
  async scan(qrCode: string, verifierId: number) {
    const reservation = await this.reservationRepo.findOne({ where: { qrCode } });
    if (!reservation) {
      throw new NotFoundException('无效的核销码');
    }

    if (reservation.status === 'VERIFIED') {
      throw new BadRequestException('该预约已核销，不可重复使用');
    }

    // NOTE: 临时取消过期限制，方便开发测试
    // if (reservation.qrCodeExpireAt && new Date() > new Date(reservation.qrCodeExpireAt)) {
    //   throw new BadRequestException('核销码已过期');
    // }
    // const today = new Date();
    // const resDate = new Date(reservation.reservationDate);
    // if (resDate.toDateString() !== today.toDateString()) {
    //   throw new BadRequestException('核销码仅限预约当天使用');
    // }

    // 个人预约不再逐条存储参观人，仅返回人数
    let visitors: any[] = [];
    let teamInfo: any = null;
    if (reservation.type === 'TEAM') {
      teamInfo = await this.teamInfoRepo.findOne({ where: { reservationId: reservation.id } });
    }

    return {
      reservationId: reservation.id,
      reservationNo: reservation.reservationNo,
      type: reservation.type,
      sessionType: reservation.sessionType,
      reservationDate: reservation.reservationDate,
      visitorCount: reservation.visitorCount,
      status: reservation.status,
      visitors,
      teamInfo: teamInfo
        ? {
            contactName: teamInfo.contactName,
            contactPhone: teamInfo.contactPhone,
            teamType: teamInfo.teamType,
            orgName: teamInfo.orgName,
          }
        : null,
    };
  }

  /**
   * 确认核销
   */
  async confirm(reservationId: number, verifierId: number, actualCount?: number) {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('预约记录不存在');

    if (reservation.status === 'VERIFIED') {
      throw new BadRequestException('该预约已被核销');
    }

    reservation.status = 'VERIFIED';
    reservation.verifierId = verifierId;
    reservation.verifyTime = new Date();
    await this.reservationRepo.save(reservation);

    const record = this.recordRepo.create({
      reservationId,
      verifierId,
      qrCode: reservation.qrCode,
      verifyResult: 'SUCCESS',
      verifiedAt: new Date(),
      actualCount: actualCount || reservation.visitorCount,
    });
    await this.recordRepo.save(record);

    this.logger.log(`[confirm] 预约核销完成 reservationId=${reservationId} type=${reservation.type} status=${reservation.status}→VERIFIED`);

    // 标记推广记录的核销状态
    this.promotionService.markVerifiedByReservation(reservationId).catch(err => {
      this.logger.warn(`标记推广核销失败: ${err.message}`);
    });

    return { success: true, verifiedAt: record.verifiedAt };
  }

  /** 获取核销人员的核销记录（含预约详情） */
  async findByVerifier(verifierId: number, page = 1, pageSize = 10) {
    const [records, total] = await this.recordRepo.findAndCount({
      where: { verifierId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { verifiedAt: 'DESC' },
      relations: ['reservation'],
    });

    const list = records.map((r) => ({
      id: r.id,
      reservationId: r.reservationId,
      verifiedAt: r.verifiedAt,
      reservationNo: r.reservation?.reservationNo || '',
      visitDate: r.reservation?.reservationDate || '',
      session: r.reservation?.sessionType || '',
      type: r.reservation?.type || '',
      visitorCount: r.reservation?.visitorCount || 0,
      actualCount: r.actualCount || 0,
    }));

    return { records: list, total, page, pageSize };
  }

  /** 获取核销统计（今日核销数 + 累计核销数） */
  async getStats(verifierId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayVerified, totalVerified] = await Promise.all([
      this.recordRepo.count({
        where: { verifierId, verifiedAt: Between(today, tomorrow) },
      }),
      this.recordRepo.count({ where: { verifierId } }),
    ]);

    return { todayVerified, totalVerified };
  }
}
