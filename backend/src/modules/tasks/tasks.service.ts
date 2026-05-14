import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Reservation } from '../reservation/entities/reservation.entity';
import { User } from '../user/entities/user.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ReservationDateConfig)
    private readonly dateConfigRepo: Repository<ReservationDateConfig>,
    @InjectRepository(ReservationQuota)
    private readonly quotaRepo: Repository<ReservationQuota>,
  ) {}

  /** 获取今天的日期字符串 YYYY-MM-DD */
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 每日凌晨 1:00 自动创建未来 30 天可预约日期（滚动）
   * - 跳过周一（闭馆日）
   * - 跳过已有配置的日期
   * - 创建的日期不含配额（配额在配置时由管理员设定默认值）
   */
  @Cron('0 1 * * *')
  async handleRollingDateCreation() {
    this.logger.log('开始滚动创建可预约日期...');

    const lookAheadDays = 30;
    let created = 0;

    for (let i = 1; i <= lookAheadDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      // 跳过周一
      if (d.getDay() === 1) continue;

      const dateStr = d.toISOString().slice(0, 10);

      // 跳过已有配置的日期
      const existing = await this.dateConfigRepo.findOne({ where: { date: dateStr } });
      if (existing) continue;

      // 创建日期配置（使用可预约状态，配额默认为 0，由管理员设定）
      const config = this.dateConfigRepo.create({
        date: dateStr,
        isAvailable: true,
        amPersonalQuota: 500,
        amTeamQuota: 200,
        pmPersonalQuota: 500,
        pmTeamQuota: 200,
      });
      const saved = await this.dateConfigRepo.save(config);

      // 同步创建配额记录
      await this.quotaRepo.save([
        this.quotaRepo.create({
          dateConfigId: saved.id,
          sessionType: 'AM',
          totalPersonal: 500,
          totalTeam: 200,
        }),
        this.quotaRepo.create({
          dateConfigId: saved.id,
          sessionType: 'PM',
          totalPersonal: 500,
          totalTeam: 200,
        }),
      ]);

      created++;
    }

    this.logger.log(`滚动创建了 ${created} 个可预约日期`);
  }

  /**
   * 每日凌晨 2:00 处理过期预约
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredReservations() {
    this.logger.log('开始处理过期预约...');

    const today = this.today();
    const expired = await this.reservationRepo.find({
      where: {
        reservationDate: LessThan(today),
        status: In(['PENDING', 'APPROVED']),
      },
    });

    if (expired.length === 0) {
      this.logger.log('无过期预约需要处理');
      return;
    }

    this.logger.log(`发现 ${expired.length} 条过期预约，正在处理...`);

    // 统计每个用户的过期次数
    const userNoShowMap = new Map<number, number>();
    for (const r of expired) {
      userNoShowMap.set(r.userId, (userNoShowMap.get(r.userId) || 0) + 1);
    }

    // 标记预约过期
    await this.reservationRepo.update(
      { id: In(expired.map((r) => r.id)) },
      { status: 'EXPIRED' },
    );

    // 递增用户过期次数
    for (const [userId, count] of userNoShowMap) {
      await this.userRepo.increment({ id: userId }, 'noShowCount', count);
    }

    this.logger.log(`已处理 ${expired.length} 条过期预约`);
  }

  /**
   * 每日凌晨 2:30 执行自动拉黑
   * 1. 过期次数 >= 3 的用户自动拉黑 90 天
   * 2. 移除已到期的黑名单
   */
  @Cron('30 2 * * *')
  async handleAutoBlacklist() {
    this.logger.log('开始处理自动拉黑...');

    const now = new Date();

    // 1. 过期次数 >= 3 且未拉黑的用户
    const toBlacklist = await this.userRepo
      .createQueryBuilder('user')
      .where('user.noShowCount >= 3')
      .andWhere('user.isBlacklisted = false')
      .andWhere('user.status = 1')
      .getMany();

    if (toBlacklist.length > 0) {
      const blacklistUntil = new Date();
      blacklistUntil.setDate(blacklistUntil.getDate() + 90);

      for (const user of toBlacklist) {
        await this.userRepo.update(user.id, {
          isBlacklisted: true,
          blacklistUntil,
        });
      }
      this.logger.log(`已自动拉黑 ${toBlacklist.length} 个用户（90天）`);
    }

    // 2. 移除已到期的黑名单
    const expiredBlacklist = await this.userRepo.find({
      where: {
        isBlacklisted: true,
        blacklistUntil: LessThan(now),
      },
    });

    if (expiredBlacklist.length > 0) {
      await this.userRepo.update(
        { id: In(expiredBlacklist.map((u) => u.id)) },
        { isBlacklisted: false, blacklistUntil: null as any, noShowCount: 0 },
      );
      this.logger.log(`已移除 ${expiredBlacklist.length} 个过期黑名单`);
    }

    this.logger.log('自动拉黑处理完成');
  }
}
