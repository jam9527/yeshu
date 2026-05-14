import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, In } from 'typeorm';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';
import { Reservation } from './entities/reservation.entity';
import { ReservationVisitor } from './entities/reservation-visitor.entity';
import { ReservationQuota } from './entities/reservation-quota.entity';
import { ReservationDateConfig } from './entities/reservation-date-config.entity';
import { TeamReservationInfo } from './entities/team-reservation-info.entity';
import { UserService } from '../user/user.service';
import { FrequencyLimit } from '../reservation-config/entities/frequency-limit.entity';
import { SystemConfig } from '../reservation-config/entities/system-config.entity';
import { RealNameInfo } from '../real-name/entities/real-name.entity';

/**
 * 预约核心服务
 *
 * 关键设计:
 * 1. 配额扣减使用乐观锁（version 字段），防止高并发超售
 * 2. 个人预约提交时实时扣减配额
 * 3. 团队预约先占位（状态=APPROVING），审核通过后再扣减配额
 * 4. 取消预约时回退配额
 */
@Injectable()
export class ReservationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationVisitor)
    private readonly visitorRepo: Repository<ReservationVisitor>,
    @InjectRepository(ReservationQuota)
    private readonly quotaRepo: Repository<ReservationQuota>,
    @InjectRepository(ReservationDateConfig)
    private readonly dateConfigRepo: Repository<ReservationDateConfig>,
    @InjectRepository(TeamReservationInfo)
    private readonly teamInfoRepo: Repository<TeamReservationInfo>,
    @InjectRepository(FrequencyLimit)
    private readonly freqRepo: Repository<FrequencyLimit>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
    @InjectRepository(RealNameInfo)
    private readonly realNameRepo: Repository<RealNameInfo>,
    private readonly userService: UserService,
  ) {}

  /** 获取可预约日期列表（含剩余名额） */
  async getAvailableDates() {
    const configs = await this.dateConfigRepo.find({
      order: { date: 'ASC' },
    });

    const result: any[] = [];
    for (const config of configs) {
      const quotas = await this.quotaRepo.find({
        where: { dateConfigId: config.id },
      });

      const amQuota = quotas.find((q) => q.sessionType === 'AM');
      const pmQuota = quotas.find((q) => q.sessionType === 'PM');

      result.push({
        id: config.id,
        date: config.date,
        isAvailable: config.isAvailable,
        morning: {
          startTime: config.morningStart,
          endTime: config.morningEnd,
          remainingPersonal: amQuota ? amQuota.totalPersonal - amQuota.usedPersonal : 0,
          remainingTeam: amQuota ? amQuota.totalTeam - amQuota.usedTeam : 0,
        },
        afternoon: {
          startTime: config.afternoonStart,
          endTime: config.afternoonEnd,
          remainingPersonal: pmQuota ? pmQuota.totalPersonal - pmQuota.usedPersonal : 0,
          remainingTeam: pmQuota ? pmQuota.totalTeam - pmQuota.usedTeam : 0,
        },
      });
    }
    return result;
  }

  /** 获取指定日期的配额详情 */
  async getDateQuota(date: string) {
    const config = await this.dateConfigRepo.findOne({ where: { date } });
    if (!config) throw new NotFoundException('该日期未配置预约');
    return this.getAvailableDates();
  }

  /**
   * 检查频率限制
   * 从 frequency_limits 表读取配置，检查用户预约次数是否超限
   */
  async checkFrequencyLimit(userId: number, type: string = 'PERSONAL') {
    const limits = await this.freqRepo.find({ where: { type, enabled: true } });
    if (limits.length === 0) return; // 未配置限制

    const now = new Date();

    for (const limit of limits) {
      let startDate: Date;
      switch (limit.period) {
        case 'WEEKLY':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - startDate.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'MONTHLY':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'YEARLY':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'TOTAL':
        default:
          startDate = new Date(0); // 不限时间范围
          break;
      }

      const count = limit.period === 'TOTAL'
        ? await this.reservationRepo.count({ where: { userId, type } })
        : await this.reservationRepo.count({
            where: { userId, type, createdAt: MoreThan(startDate) },
          });

      if (limit.maxCount > 0 && count >= limit.maxCount) {
        const periodLabels: Record<string, string> = {
          WEEKLY: '本周', MONTHLY: '本月', YEARLY: '本年', TOTAL: '累计',
        };
        throw new BadRequestException(`${periodLabels[limit.period] || ''}预约次数已用尽`);
      }
    }
  }

  /**
   * 创建个人预约
   * 使用乐观锁扣减配额，防止超售
   */
  async createPersonal(
    userId: number,
    dto: {
      dateConfigId: number;
      sessionType: string;
      visitors: { name: string; idCard: string; province: string; city: string }[];
    },
  ) {
    const { dateConfigId, sessionType, visitors } = dto;
    const count = visitors.length;

    // 校验人数（1-5人）
    if (count < 1 || count > 5) {
      throw new BadRequestException('个人预约人数应在1-5人之间');
    }

    // 获取日期配置
    const dateConfig = await this.dateConfigRepo.findOne({ where: { id: dateConfigId } });
    if (!dateConfig || !dateConfig.isAvailable) {
      throw new BadRequestException('该日期不可预约');
    }

    // 检查用户黑名单状态
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isBlacklisted && user.blacklistUntil && user.blacklistUntil > new Date()) {
      const days = Math.ceil((user.blacklistUntil.getTime() - Date.now()) / 86400000);
      throw new ForbiddenException(`您已被限制预约，剩余 ${days} 天`);
    }

    // 检查用户是否有核验通过的实名记录
    const verifiedCount = await this.realNameRepo.count({
      where: { userId, idVerified: true, isDeleted: false },
    });
    if (verifiedCount === 0) {
      throw new ForbiddenException('请先完成实名认证（身份核验通过）后再进行个人预约');
    }

    // 检查频率限制（从数据库读取配置）
    await this.checkFrequencyLimit(userId, 'PERSONAL');

    // 乐观锁扣减配额
    const quota = await this.quotaRepo.findOne({
      where: { dateConfigId, sessionType },
    });
    if (!quota) throw new BadRequestException('配额配置不存在');

    const remaining = sessionType === 'AM'
      ? dateConfig.amPersonalQuota - quota.usedPersonal
      : dateConfig.pmPersonalQuota - quota.usedPersonal;

    if (remaining < count) {
      throw new ConflictException('预约名额不足');
    }

    // 执行乐观锁更新
    const updateResult = await this.quotaRepo
      .createQueryBuilder()
      .update()
      .set({
        usedPersonal: () => `\`usedPersonal\` + ${count}`,
        version: () => '`version` + 1',
      })
      .where('id = :id', { id: quota.id })
      .andWhere('`totalPersonal` - `usedPersonal` >= :count', { count })
      .andWhere('version = :version', { version: quota.version })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConflictException('预约名额已被抢完，请刷新后重试');
    }

    // 生成预约编号和核销码
    const dateStr = dateConfig.date.replace(/-/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reservationNo = `YS${dateStr}${randomStr}`;

    const qrCode = crypto
      .createHash('md5')
      .update(`${reservationNo}_${userId}_${dateConfig.date}_${sessionType}_yeshu2024`)
      .digest('hex');

    // 创建预约记录
    const reservation = this.reservationRepo.create({
      reservationNo,
      userId,
      type: 'PERSONAL',
      sessionType,
      reservationDate: dateConfig.date,
      dateConfigId,
      visitorCount: count,
      status: 'PENDING',
      qrCode,
      qrCodeExpireAt: new Date(`${dateConfig.date}T23:59:59`),
    });
    const saved = await this.reservationRepo.save(reservation);

    // 创建参观人明细
    const visitorEntities = visitors.map((v) =>
      this.visitorRepo.create({ ...v, reservationId: saved.id }),
    );
    await this.visitorRepo.save(visitorEntities);

    return {
      id: saved.id,
      reservationNo: saved.reservationNo,
      status: saved.status,
      qrCode: saved.qrCode,
    };
  }

  /**
   * 创建团队预约
   * 团队预约需后台审核，配额在审核通过时扣减
   */
  async createTeam(
    userId: number,
    dto: {
      dateConfigId: number;
      sessionType: string;
      visitorCount: number;
      contactName: string;
      contactPhone: string;
      idCardType?: string;
      contactIdCard?: string;
      teamType: string;
      orgName: string;
      orgCode?: string;
      applicationFile?: string;
      attachmentFiles?: string;
    },
  ) {
    const { dateConfigId, sessionType, visitorCount, ...teamInfo } = dto;

    // 检查频率限制
    await this.checkFrequencyLimit(userId, 'TEAM');

    // 校验人数（>=10人）
    if (visitorCount < 10) {
      throw new BadRequestException('团队预约至少需要10人');
    }

    // 校验日期配置
    const dateConfig = await this.dateConfigRepo.findOne({ where: { id: dateConfigId } });
    if (!dateConfig || !dateConfig.isAvailable) {
      throw new BadRequestException('该日期不可预约');
    }

    // 检查剩余名额
    const quota = await this.quotaRepo.findOne({
      where: { dateConfigId, sessionType },
    });
    if (!quota) throw new BadRequestException('配额配置不存在');

    const teamQuota = sessionType === 'AM' ? dateConfig.amTeamQuota : dateConfig.pmTeamQuota;
    if (teamQuota - quota.usedTeam < visitorCount) {
      throw new ConflictException('团队预约名额不足');
    }

    // 生成预约编号和核销码
    const dateStr = dateConfig.date.replace(/-/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reservationNo = `YST${dateStr}${randomStr}`;

    const qrCode = crypto
      .createHash('md5')
      .update(`${reservationNo}_${userId}_${dateConfig.date}_team_yeshu2024`)
      .digest('hex');

    // 创建预约（状态=APPROVING，不扣减配额）
    const reservation = this.reservationRepo.create({
      reservationNo,
      userId,
      type: 'TEAM',
      sessionType,
      reservationDate: dateConfig.date,
      dateConfigId,
      visitorCount,
      status: 'APPROVING',
      qrCode,
      qrCodeExpireAt: new Date(`${dateConfig.date}T23:59:59`),
    });
    const saved = await this.reservationRepo.save(reservation);

    // 创建团队附加信息
    const teamEntity = this.teamInfoRepo.create({
      reservationId: saved.id,
      ...teamInfo,
    });
    await this.teamInfoRepo.save(teamEntity);

    return {
      id: saved.id,
      reservationNo: saved.reservationNo,
      status: saved.status,
      qrCode: saved.qrCode,
    };
  }

  /** 获取用户的预约列表 */
  async findByUser(userId: number, page = 1, pageSize = 10, type?: string, status?: string) {
    const where: any = { userId };
    if (type) where.type = type;
    if (status) {
      // 支持逗号分隔的多个状态值
      const statusList = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else if (statusList.length > 1) {
        where.status = In(statusList);
      }
    }

    const [records, total] = await this.reservationRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { records, total, page, pageSize };
  }

  /** 获取预约详情 */
  /** 生成核销二维码 PNG buffer（供图片接口使用） */
  async generateQrCodeImage(id: number): Promise<Buffer> {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('预约记录不存在');

    const data = reservation.qrCode || reservation.reservationNo;
    return qrcode.toBuffer(data, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  async findById(id: number) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('预约记录不存在');

    const visitors = await this.visitorRepo.find({ where: { reservationId: id } });
    let teamInfo: TeamReservationInfo | null = null;
    if (reservation.type === 'TEAM') {
      teamInfo = await this.teamInfoRepo.findOne({ where: { reservationId: id } });
    }

    return { ...reservation, visitors, teamInfo };
  }

  /** 取消预约 */
  async cancel(id: number, userId: number, reason?: string) {
    const reservation = await this.reservationRepo.findOne({ where: { id, userId } });
    if (!reservation) throw new NotFoundException('预约记录不存在');

    if (!['PENDING', 'APPROVING', 'APPROVED'].includes(reservation.status)) {
      throw new BadRequestException('当前状态不可取消');
    }

    // 当天预约17点前可取消
    if (reservation.reservationDate === this.today()) {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(17, 0, 0, 0);
      if (now > cutoff) {
        throw new BadRequestException('当天预约17:00后不可取消');
      }
    }

    const wasApproved = reservation.status === 'APPROVED';
    const wasPersonal = reservation.type === 'PERSONAL';

    // 更新状态
    reservation.status = 'CANCELLED';
    reservation.cancelReason = reason || '用户主动取消';
    reservation.cancelTime = new Date();
    await this.reservationRepo.save(reservation);

    // 回退配额（个人预约直接回退；团队预约在审核通过扣减配额后才回退）
    if (wasPersonal || wasApproved) {
      const field = wasPersonal ? 'usedPersonal' : 'usedTeam';
      await this.quotaRepo
        .createQueryBuilder()
        .update()
        .set({ [field]: () => `${field} - ${reservation.visitorCount}` })
        .where('dateConfigId = :dateConfigId', {
          dateConfigId: reservation.dateConfigId,
        })
        .andWhere('sessionType = :sessionType', {
          sessionType: reservation.sessionType,
        })
        .execute();
    }

    return { success: true };
  }

  /** 创建测试用的可预约日期（未来30天，不含周一） */
  async seedTestDates() {
    const existing = await this.dateConfigRepo.count();
    if (existing > 0) {
      return { message: '已有日期配置，跳过种子数据', count: existing };
    }

    const created: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      // 跳过周一（闭馆）
      if (d.getDay() === 1) continue;

      const dateStr = d.toISOString().slice(0, 10);

      const config = await this.dateConfigRepo.save(
        this.dateConfigRepo.create({
          date: dateStr,
          isAvailable: true,
          amPersonalQuota: 500,
          amTeamQuota: 200,
          pmPersonalQuota: 500,
          pmTeamQuota: 200,
        }),
      );

      await this.quotaRepo.save([
        this.quotaRepo.create({ dateConfigId: config.id, sessionType: 'AM', totalPersonal: 500, totalTeam: 200 }),
        this.quotaRepo.create({ dateConfigId: config.id, sessionType: 'PM', totalPersonal: 500, totalTeam: 200 }),
      ]);

      created.push(dateStr);
    }

    return { message: `成功创建 ${created.length} 个可预约日期`, dates: created };
  }

  /** 创建测试用的频率限制配置 */
  async seedFrequencyLimits() {
    const existing = await this.freqRepo.count();
    if (existing > 0) {
      return { message: '已有频率限制配置，跳过', count: existing };
    }

    const defaults = [
      { type: 'PERSONAL', period: 'WEEKLY', maxCount: 3, enabled: true },
      { type: 'PERSONAL', period: 'MONTHLY', maxCount: 10, enabled: true },
      { type: 'TEAM', period: 'MONTHLY', maxCount: 5, enabled: true },
      { type: 'TEAM', period: 'TOTAL', maxCount: 20, enabled: true },
    ];

    for (const item of defaults) {
      await this.freqRepo.save(this.freqRepo.create(item));
    }

    return { message: '频率限制配置已创建', limits: defaults };
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

