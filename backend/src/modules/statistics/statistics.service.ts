import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { RealNameInfo } from '../real-name/entities/real-name.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(ReservationQuota)
    private readonly quotaRepo: Repository<ReservationQuota>,
    @InjectRepository(ReservationDateConfig)
    private readonly dateConfigRepo: Repository<ReservationDateConfig>,
    @InjectRepository(RealNameInfo)
    private readonly realNameRepo: Repository<RealNameInfo>,
  ) {}

  /** 概览数据 */
  async overview() {
    const today = new Date().toISOString().split('T')[0];

    const [totalReservations, todayReservations, pendingReview, totalVerified, todayVerified] =
      await Promise.all([
        this.reservationRepo.count(),
        this.reservationRepo.count({ where: { reservationDate: today } }),
        this.reservationRepo.count({ where: { type: 'TEAM', status: 'APPROVING' } }),
        this.reservationRepo.count({ where: { status: 'VERIFIED' } }),
        this.reservationRepo.count({ where: { reservationDate: today, status: 'VERIFIED' } }),
      ]);

    return {
      totalReservations,
      todayReservations,
      pendingReview,
      totalVerified,
      todayVerified,
      todayVerificationRate: todayReservations > 0
        ? Math.round((todayVerified / todayReservations) * 100)
        : 0,
      totalVerificationRate: totalReservations > 0
        ? Math.round((totalVerified / totalReservations) * 100)
        : 0,
    };
  }

  /** 本周预约趋势（按预约日期统计，补齐7天） */
  async weeklyTrend() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=周日, 1=周一...6=周六
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    const records = await this.reservationRepo
      .createQueryBuilder('r')
      .select("DATE(r.reservationDate) as date, COUNT(*) as count")
      .where('r.reservationDate >= :monday', { monday: monday.toISOString().split('T')[0] })
      .groupBy('DATE(r.reservationDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 补齐周一至周日7天
    const result: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const found = records.find((r: any) => {
        const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
        return rDate === dateStr;
      });
      result.push({ date: dateStr, count: found ? Number(found.count) : 0 });
    }

    return result;
  }

  /**
   * 年龄段分布统计
   * 从预约用户的实名身份证号提取出生日期计算年龄
   */
  async ageDistribution() {
    // 获取有过预约记录的用户ID
    const userIds = (await this.reservationRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.userId')
      .getRawMany())
      .map((r: any) => r.userId);

    if (userIds.length === 0) {
      return Object.entries({
        '0-17': 0, '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0,
      }).map(([group, count]) => ({ group, count, percentage: 0 }));
    }

    // 获取这些用户的实名身份证号
    const realNames = await this.realNameRepo
      .createQueryBuilder('rn')
      .select('rn.idCard')
      .where('rn.userId IN (:...userIds)', { userIds })
      .andWhere('rn.idVerified = 1')
      .andWhere('rn.isDeleted = 0')
      .getMany();

    const ageGroups: Record<string, number> = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56+': 0,
    };

    const currentYear = new Date().getFullYear();

    for (const rn of realNames) {
      // 身份证号 7-14 位为出生日期 YYYYMMDD
      const birthStr = rn.idCard?.substring(6, 14);
      if (!birthStr || birthStr.length !== 8) continue;

      const birthYear = parseInt(birthStr.substring(0, 4), 10);
      if (isNaN(birthYear)) continue;

      const age = currentYear - birthYear;

      if (age <= 17) ageGroups['0-17']++;
      else if (age <= 25) ageGroups['18-25']++;
      else if (age <= 35) ageGroups['26-35']++;
      else if (age <= 45) ageGroups['36-45']++;
      else if (age <= 55) ageGroups['46-55']++;
      else ageGroups['56+']++;
    }

    const total = realNames.length;
    return Object.entries(ageGroups).map(([group, count]) => ({
      group,
      count,
      percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
    }));
  }

  /**
   * 每月热门预约日期 Top 5
   * @param year 年份，默认当前年
   * @param month 月份，默认当前月
   */
  async popularDates(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month !== undefined ? month : now.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    const records = await this.reservationRepo
      .createQueryBuilder('r')
      .select('r.reservationDate as date, COUNT(*) as count')
      .where("r.reservationDate LIKE :prefix", { prefix: `${monthStr}%` })
      .groupBy('r.reservationDate')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return records.map((r: any) => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    }));
  }

  /**
   * 指定日期的实时配额情况
   * @param date 日期 YYYY-MM-DD，默认今天
   */
  async dailyQuota(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const config = await this.dateConfigRepo.findOne({
      where: { date: targetDate },
    });

    if (!config) {
      return {
        date: targetDate,
        available: false,
        message: '该日期未开放预约',
      };
    }

    const quotas = await this.quotaRepo.find({
      where: { dateConfigId: config.id },
    });

    const amQuota = quotas.find((q) => q.sessionType === 'AM');
    const pmQuota = quotas.find((q) => q.sessionType === 'PM');

    return {
      date: targetDate,
      available: config.isAvailable,
      morning: {
        startTime: config.morningStart.slice(0, 5),
        endTime: config.morningEnd.slice(0, 5),
        personalRemaining: config.amPersonalQuota - (amQuota?.usedPersonal || 0),
        teamRemaining: config.amTeamQuota - (amQuota?.usedTeam || 0),
        personalTotal: config.amPersonalQuota,
        teamTotal: config.amTeamQuota,
      },
      afternoon: {
        startTime: config.afternoonStart.slice(0, 5),
        endTime: config.afternoonEnd.slice(0, 5),
        personalRemaining: config.pmPersonalQuota - (pmQuota?.usedPersonal || 0),
        teamRemaining: config.pmTeamQuota - (pmQuota?.usedTeam || 0),
        personalTotal: config.pmPersonalQuota,
        teamTotal: config.pmTeamQuota,
      },
    };
  }

  /** 流量来源统计：自然流量 vs 推广流量，支持日/周/月粒度 */
  async trafficSource(
    startDate?: string,
    endDate?: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    // 日期分组表达式
    const dateExpr = granularity === 'month'
      ? "DATE_FORMAT(r.reservationDate, '%Y-%m')"
      : granularity === 'week'
        ? "CONCAT(YEAR(r.reservationDate), '-W', LPAD(WEEK(r.reservationDate, 1), 2, '0'))"
        : 'DATE(r.reservationDate)';

    // 所有预约（含状态=VERIFIED的核销数）
    const allQb = this.reservationRepo
      .createQueryBuilder('r')
      .select(`${dateExpr} as period`)
      .addSelect('COUNT(*) as total')
      .addSelect("SUM(CASE WHEN r.status = 'VERIFIED' THEN 1 ELSE 0 END) as verified")
      .addSelect("SUM(CASE WHEN r.type = 'PERSONAL' THEN 1 ELSE 0 END) as personal")
      .addSelect("SUM(CASE WHEN r.type = 'TEAM' THEN 1 ELSE 0 END) as team");

    if (startDate) allQb.andWhere('r.reservationDate >= :start', { start: startDate });
    if (endDate) allQb.andWhere('r.reservationDate <= :end', { end: endDate });

    const allRaw = await allQb.groupBy('period').orderBy('period', 'ASC').getRawMany();

    // 推广预约（在 promotion_records 中有关联的）
    const promoQb = this.reservationRepo
      .createQueryBuilder('r')
      .innerJoin('promotion_records', 'pr', 'pr.reservationId = r.id')
      .select(`${dateExpr} as period`)
      .addSelect('COUNT(*) as total')
      .addSelect("SUM(CASE WHEN r.status = 'VERIFIED' THEN 1 ELSE 0 END) as verified")
      .addSelect("SUM(CASE WHEN r.type = 'PERSONAL' THEN 1 ELSE 0 END) as personal")
      .addSelect("SUM(CASE WHEN r.type = 'TEAM' THEN 1 ELSE 0 END) as team");

    if (startDate) promoQb.andWhere('r.reservationDate >= :start', { start: startDate });
    if (endDate) promoQb.andWhere('r.reservationDate <= :end', { end: endDate });

    const promoRaw = await promoQb.groupBy('period').orderBy('period', 'ASC').getRawMany();

    // 构建时间序列
    return allRaw.map((a: any) => {
      const period = String(a.period);
      const p = promoRaw.find((pr: any) => String(pr.period) === period);
      const promoT = Number(p?.total) || 0;
      const promoV = Number(p?.verified) || 0;
      const allT = Number(a.total) || 0;
      const allV = Number(a.verified) || 0;
      return {
        period,
        total: { reservations: allT, verified: allV, personal: Number(a.personal), team: Number(a.team) },
        organic: { reservations: allT - promoT, verified: allV - promoV, personal: Number(a.personal) - (Number(p?.personal) || 0), team: Number(a.team) - (Number(p?.team) || 0) },
        promoter: { reservations: promoT, verified: promoV, personal: Number(p?.personal) || 0, team: Number(p?.team) || 0 },
      };
    });
  }

  /** 按日期范围统计预约数量 */
  async reservationStats(startDate?: string, endDate?: string) {
    let query = this.reservationRepo
      .createQueryBuilder('r')
      .select("DATE(r.reservationDate) as date, r.sessionType, r.type, COUNT(*) as count");

    if (startDate) {
      query = query.andWhere('r.reservationDate >= :start', { start: startDate });
    }
    if (endDate) {
      query = query.andWhere('r.reservationDate <= :end', { end: endDate });
    }

    const records = await query
      .groupBy('DATE(r.reservationDate), r.sessionType, r.type')
      .orderBy('DATE(r.reservationDate)', 'ASC')
      .getRawMany();

    return records.map((r: any) => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    }));
  }
}
