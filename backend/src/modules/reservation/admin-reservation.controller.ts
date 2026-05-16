import { Controller, Get, Put, Param, Query, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationVisitor } from './entities/reservation-visitor.entity';
import { TeamReservationInfo } from './entities/team-reservation-info.entity';
import { ReservationQuota } from './entities/reservation-quota.entity';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';
import { User } from '../user/entities/user.entity';
import { NotificationService } from '../notification/notification.service';

/**
 * 管理后台 - 预约管理接口
 */
@AdminPermissions()
@Controller('admin')
export class AdminReservationController {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationVisitor)
    private readonly visitorRepo: Repository<ReservationVisitor>,
    @InjectRepository(TeamReservationInfo)
    private readonly teamInfoRepo: Repository<TeamReservationInfo>,
    @InjectRepository(ReservationQuota)
    private readonly quotaRepo: Repository<ReservationQuota>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifService: NotificationService,
  ) {}

  /** GET /api/admin/reservations - 预约记录列表 */
  @Get('reservations')
  async getReservations(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [records, total] = await this.reservationRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    // 获取核销员姓名
    const verifierIds = records.filter(r => r.verifierId).map(r => Number(r.verifierId));
    const verifiers = verifierIds.length > 0
      ? await this.userRepo.find({ where: { id: In(verifierIds) } })
      : [];
    const verifierMap = new Map(verifiers.map(v => [Number(v.id), v.nickname || v.phone || '核销员']));

    // 获取参观人信息
    const reservationIds = records.map(r => r.id);
    const allVisitors = reservationIds.length > 0
      ? await this.visitorRepo.find({ where: { reservationId: In(reservationIds) } })
      : [];
    const visitorMap = new Map<number, { name: string; idCard: string }[]>();
    allVisitors.forEach(v => {
      if (!visitorMap.has(v.reservationId)) visitorMap.set(v.reservationId, []);
      visitorMap.get(v.reservationId)!.push({ name: v.name, idCard: v.idCard });
    });

    const list = records.map(r => ({
      id: r.id,
      reservationNo: r.reservationNo,
      type: r.type,
      sessionType: r.sessionType,
      reservationDate: r.reservationDate,
      visitorCount: r.visitorCount,
      status: r.status,
      qrCode: r.qrCode,
      rejectReason: r.rejectReason,
      cancelReason: r.cancelReason,
      verifierId: r.verifierId,
      verifyTime: r.verifyTime,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      verifierName: verifierMap.get(Number(r.verifierId)) || null,
      user: r.user ? {
        id: r.user.id,
        nickname: r.user.nickname,
        phone: r.user.phone,
        openid: r.user.openid,
        avatarUrl: r.user.avatarUrl,
        isBlacklisted: r.user.isBlacklisted,
      } : null,
      visitors: visitorMap.get(r.id) || [],
    }));

    return { records: list, total, page, pageSize };
  }

  /** GET /api/admin/reservations/pending-review - 待审核列表（团队预约） */
  @Get('reservations/pending-review')
  async getPendingReview(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const [records, total] = await this.reservationRepo.findAndCount({
      where: { type: 'TEAM', status: 'APPROVING' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
      relations: ['user'],
    });
    return { records, total, page, pageSize };
  }

  /** GET /api/admin/reservations/:id - 预约详情 */
  @Get('reservations/:id')
  async getDetail(@Param('id') id: number) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) return null;

    const visitors = await this.visitorRepo.find({ where: { reservationId: id } });
    let teamInfo: TeamReservationInfo | null = null;
    if (reservation.type === 'TEAM') {
      teamInfo = await this.teamInfoRepo.findOne({ where: { reservationId: id } });
    }
    return { ...reservation, visitors, teamInfo };
  }

  /** PUT /api/admin/reservations/:id/approve - 审核通过（团队预约） */
  @Put('reservations/:id/approve')
  async approve(@Param('id') id: number) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) return { success: false, message: '预约不存在' };

    reservation.status = 'APPROVED';
    await this.reservationRepo.save(reservation);

    // 审核通过时扣减团队配额
    await this.quotaRepo
      .createQueryBuilder()
      .update()
      .set({ usedTeam: () => `\`usedTeam\` + ${reservation.visitorCount}` })
      .where('`dateConfigId` = :dateConfigId', { dateConfigId: reservation.dateConfigId })
      .andWhere('`sessionType` = :sessionType', { sessionType: reservation.sessionType })
      .execute();

    // 发送通知
    await this.notifService.create({
      userId: reservation.userId,
      type: 'RESERVATION_APPROVED',
      title: '团队预约审核通过',
      content: `您于 ${reservation.reservationDate} 的团队预约（编号: ${reservation.reservationNo}）已审核通过，请按时参观。`,
      relatedId: reservation.id,
    });

    return { success: true };
  }

  /** PUT /api/admin/reservations/:id/reject - 驳回 */
  @Put('reservations/:id/reject')
  async reject(@Param('id') id: number, @Body('reason') reason: string) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) return { success: false, message: '预约不存在' };

    reservation.status = 'REJECTED';
    reservation.rejectReason = reason || '未通过审核';
    reservation.rejectTime = new Date();
    await this.reservationRepo.save(reservation);

    // 发送通知
    await this.notifService.create({
      userId: reservation.userId,
      type: 'RESERVATION_REJECTED',
      title: '团队预约审核未通过',
      content: `您于 ${reservation.reservationDate} 的团队预约（编号: ${reservation.reservationNo}）未通过审核，原因: ${reason || '未通过审核'}。`,
      relatedId: reservation.id,
    });

    return { success: true };
  }
}
