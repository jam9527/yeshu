import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Reservation } from '../modules/reservation/entities/reservation.entity';
import { User } from '../modules/user/entities/user.entity';
import { ReservationDateConfig } from '../modules/reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../modules/reservation/entities/reservation-quota.entity';

/**
 * Bull 任务队列处理器
 * 将定时任务（预约过期、自动拉黑等）移至队列执行，
 * 支持自动重试和任务监控
 */
@Processor('tasks')
export class TasksProcessor {
  private readonly logger = new Logger(TasksProcessor.name);

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

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 处理过期预约
   * 每天凌晨 2:00 由 cron 触发入队
   */
  @Process('expire-reservations')
  async handleExpiredReservations(job: Job) {
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

    const userNoShowMap = new Map<number, number>();
    for (const r of expired) {
      userNoShowMap.set(r.userId, (userNoShowMap.get(r.userId) || 0) + 1);
    }

    await this.reservationRepo.update(
      { id: In(expired.map((r) => r.id)) },
      { status: 'EXPIRED' },
    );

    for (const [userId, count] of userNoShowMap) {
      await this.userRepo.increment({ id: userId }, 'noShowCount', count);
    }

    this.logger.log(`已处理 ${expired.length} 条过期预约`);
  }

  /**
   * 处理自动拉黑
   * 每天凌晨 2:30 由 cron 触发入队
   */
  @Process('auto-blacklist')
  async handleAutoBlacklist(job: Job) {
    this.logger.log('开始处理自动拉黑...');

    const now = new Date();

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

  /**
   * 处理滚动日期创建
   * 每天凌晨 1:00 由 cron 触发入队
   */
  @Process('create-dates')
  async handleRollingDateCreation(job: Job) {
    this.logger.log('开始滚动创建可预约日期...');

    const lookAheadDays = 30;
    let created = 0;

    for (let i = 1; i <= lookAheadDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() === 1) continue;

      const dateStr = d.toISOString().slice(0, 10);

      const existing = await this.dateConfigRepo.findOne({ where: { date: dateStr } });
      if (existing) continue;

      const config = this.dateConfigRepo.create({
        date: dateStr,
        isAvailable: true,
        amPersonalQuota: 500,
        amTeamQuota: 200,
        pmPersonalQuota: 500,
        pmTeamQuota: 200,
      });
      const saved = await this.dateConfigRepo.save(config);

      await this.quotaRepo.save([
        this.quotaRepo.create({ dateConfigId: saved.id, sessionType: 'AM', totalPersonal: 500, totalTeam: 200 }),
        this.quotaRepo.create({ dateConfigId: saved.id, sessionType: 'PM', totalPersonal: 500, totalTeam: 200 }),
      ]);

      created++;
    }

    this.logger.log(`滚动创建了 ${created} 个可预约日期`);
  }
}
