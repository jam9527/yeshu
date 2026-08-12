import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VerificationRecord } from './entities/verification-record.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { TeamReservationInfo } from '../reservation/entities/team-reservation-info.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
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
    @InjectRepository(ReservationDateConfig)
    private readonly dateConfigRepo: Repository<ReservationDateConfig>,
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

    // 仅 PENDING(个人)/APPROVED(团队) 可核销，取消/过期/驳回/待审核的预约不可核销
    if (!['PENDING', 'APPROVED'].includes(reservation.status)) {
      throw new BadRequestException('该预约当前状态不可核销');
    }

    // 核销码仅限预约当天使用，过期或未到期均不可核销
    if (reservation.qrCodeExpireAt && new Date() > new Date(reservation.qrCodeExpireAt)) {
      throw new BadRequestException('核销码已过期');
    }
    const today = new Date();
    const resDate = new Date(reservation.reservationDate);
    if (resDate.toDateString() !== today.toDateString()) {
      throw new BadRequestException('核销码仅限预约当天使用');
    }

    // 场次时间校验（宽容时间取自日期配置），防跨场次核销
    await this.assertSessionTime(reservation);

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
   * - 仅限预约当天（与扫码校验一致）
   * - 仅 PENDING(个人)/APPROVED(团队) 可核销，防止取消/过期/驳回的预约被核销
   * - 实到人数必须是 [0, visitorCount] 的整数，未传时默认预约人数（0 明确允许，如实记录无人到场）
   * - 状态更新用原子 UPDATE + WHERE 条件，防止并发重复核销（实到被重复求和）
   */
  async confirm(reservationId: number, verifierId: number, actualCount?: number) {
    const reservation = await this.reservationRepo.findOne({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('预约记录不存在');

    // 核销仅限预约当天
    const resDate = new Date(reservation.reservationDate);
    if (resDate.toDateString() !== new Date().toDateString()) {
      throw new BadRequestException('核销码仅限预约当天使用');
    }

    // 场次时间校验（宽容时间取自日期配置），防跨场次核销
    await this.assertSessionTime(reservation);

    // 实到人数校验：未传则默认预约人数；传入则必须是 [0, visitorCount] 的整数
    let finalActualCount: number;
    if (actualCount === undefined || actualCount === null) {
      finalActualCount = reservation.visitorCount;
    } else {
      const n = typeof actualCount === 'number' ? actualCount : Number(actualCount);
      if (!Number.isInteger(n) || n < 0) {
        throw new BadRequestException('实到人数必须是非负整数');
      }
      if (n > reservation.visitorCount) {
        throw new BadRequestException('实到人数不能超过预约人数');
      }
      finalActualCount = n;
    }

    // 原子更新状态，仅 PENDING/APPROVED 可流转到 VERIFIED；affected=0 说明已核销或状态不可核销
    const updateResult = await this.reservationRepo
      .createQueryBuilder()
      .update(Reservation)
      .set({ status: 'VERIFIED', verifierId, verifyTime: new Date() })
      .where('id = :id', { id: reservationId })
      .andWhere('status IN (:...validStatuses)', { validStatuses: ['PENDING', 'APPROVED'] })
      .execute();

    if (updateResult.affected === 0) {
      const current = await this.reservationRepo.findOne({ where: { id: reservationId } });
      if (!current) throw new NotFoundException('预约记录不存在');
      if (current.status === 'VERIFIED') {
        throw new BadRequestException('该预约已被核销');
      }
      throw new BadRequestException('当前预约状态不可核销');
    }

    const record = this.recordRepo.create({
      reservationId,
      verifierId,
      qrCode: reservation.qrCode,
      verifyResult: 'SUCCESS',
      verifiedAt: new Date(),
      actualCount: finalActualCount,
    });
    await this.recordRepo.save(record);

    this.logger.log(`[confirm] 预约核销完成 reservationId=${reservationId} type=${reservation.type} status=${reservation.status}→VERIFIED`);

    // 标记推广记录的核销状态
    this.promotionService.markVerifiedByReservation(reservationId).catch(err => {
      this.logger.warn(`标记推广核销失败: ${err.message}`);
    });

    return { success: true, verifiedAt: record.verifiedAt };
  }

  /** 获取核销人员的核销记录（含预约详情 + 预约人信息） */
  async findByVerifier(verifierId: number, page = 1, pageSize = 10, date?: string) {
    const where: any = { verifierId };
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.verifiedAt = Between(dayStart, dayEnd);
    }

    const [records, total] = await this.recordRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { verifiedAt: 'DESC' },
      relations: ['reservation', 'reservation.user'],
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
      district: r.reservation?.district || '',
      visitorType: r.reservation?.visitorType || '',
      childrenCount: r.reservation?.childrenCount || 0,
      userNickname: r.reservation?.user?.nickname || '',
      userPhone: r.reservation?.user?.phone || '',
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

  /** 时间字符串 "HH:mm[:ss]" → 当天分钟数 */
  private timeToMinutes(t: string): number {
    const parts = String(t).split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  /** 分钟数 → "HH:mm" */
  private formatMinutes(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** 分钟数 → 中文时长（30 → "30 分钟"，60 → "1 小时"，90 → "1 小时 30 分钟"） */
  private formatDuration(min: number): string {
    if (min < 60) return `${min} 分钟`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
  }

  /**
   * 场次时间校验：仅允许在"开场前earlyGrace分钟 ~ 闭场后lateGrace分钟"窗口内核销，防跨场次核销
   * 宽容时间读取日期配置的 earlyGraceMinutes/lateGraceMinutes，缺省 30/60 分钟
   * - 早于"场次开始 - earlyGrace"：提示等待（早到可等待，届时再扫）
   * - 晚于"场次结束 + lateGrace"：拒绝，提示重新预约
   */
  private async assertSessionTime(reservation: Reservation) {
    const config = await this.dateConfigRepo.findOne({ where: { id: reservation.dateConfigId } });
    const isMorning = reservation.sessionType === 'AM';
    const isAfternoon = reservation.sessionType === 'PM';
    if (!isMorning && !isAfternoon && reservation.sessionType !== 'EV') return; // 未知场次跳过
    if (!config) return; // 无日期配置则跳过，不阻断

    const start = isMorning ? config.morningStart : isAfternoon ? config.afternoonStart : config.eveningStart;
    const end = isMorning ? config.morningEnd : isAfternoon ? config.afternoonEnd : config.eveningEnd;
    if (!start || !end) return;

    const earlyGrace = config.earlyGraceMinutes ?? 30; // 开场前可提前核销分钟数
    const lateGrace = config.lateGraceMinutes ?? 60;   // 闭场后可延后核销分钟数

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = this.timeToMinutes(start);
    const endMin = this.timeToMinutes(end);

    if (nowMin < startMin - earlyGrace) {
      throw new BadRequestException(`尚未到预约场次，请于 ${this.formatMinutes(startMin - earlyGrace)} 后入场（早到可等待）`);
    }
    if (nowMin > endMin + lateGrace) {
      throw new BadRequestException(`已超过预约场次 ${this.formatDuration(lateGrace)}，无法核销，请重新预约`);
    }
  }
}
