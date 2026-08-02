import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, LessThanOrEqual, Between, IsNull, In } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { get } from 'https';
import sharp from 'sharp';
import { PromotionRecord } from './entities/promotion-record.entity';
import { PromoterApplication } from './entities/promoter-application.entity';
import { PromotionPoster } from './entities/promotion-poster.entity';
import { User } from '../user/entities/user.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { WechatService } from '../wechat/wechat.service';
import { CosService } from '../file/cos.service';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(PromotionRecord)
    private readonly recordRepo: Repository<PromotionRecord>,
    @InjectRepository(PromoterApplication)
    private readonly applicationRepo: Repository<PromoterApplication>,
    @InjectRepository(PromotionPoster)
    private readonly posterRepo: Repository<PromotionPoster>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => WechatService))
    private readonly wechatService: WechatService,
    private readonly cosService: CosService,
  ) {}

  // ========== 推广记录 ==========

  /** 记录分享点击（已登录用户直接绑定 visitorUserId） */
  async recordClick(promoterId: number, visitorOpenid?: string, visitorUserId?: number) {
    const record = this.recordRepo.create({
      promoterId,
      visitorOpenid,
      visitorUserId,
      clickedAt: new Date(),
    });
    return this.recordRepo.save(record);
  }

  /** 为已登录用户建立推广关系（设置 promotedBy，避免依赖登录流程） */
  async associatePromoter(visitorUserId: number, promoterId: number) {
    if (visitorUserId === promoterId) return;
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: visitorUserId } });
    if (user && !user.promotedBy) {
      await this.dataSource.getRepository(User).update(visitorUserId, { promotedBy: promoterId });
    }
  }

  /** 绑定被推广人用户ID */
  async bindVisitorUser(recordId: number, visitorUserId: number) {
    await this.recordRepo.update(recordId, { visitorUserId });
  }

  /** 登录后根据 promoterId 找到最新未绑定用户的推广记录，关联访客 */
  async bindVisitorByLogin(promoterId: number, visitorUserId: number, visitorOpenid: string) {
    const record = await this.recordRepo.findOne({
      where: { promoterId, visitorUserId: IsNull() },
      order: { clickedAt: 'DESC' },
    });
    if (record) {
      record.visitorUserId = visitorUserId;
      record.visitorOpenid = visitorOpenid;
      await this.recordRepo.save(record);
    }
  }

  /** 关联推广预约（取最新的推广记录） */
  async linkReservation(visitorUserId: number, reservationId: number) {
    const record = await this.recordRepo.findOne({
      where: { visitorUserId },
      order: { clickedAt: 'DESC' },
    });
    if (record) {
      record.reservationId = reservationId;
      await this.recordRepo.save(record);
      this.logger.log(`[linkReservation] 关联成功 visitorUserId=${visitorUserId} reservationId=${reservationId} recordId=${record.id} promoterId=${record.promoterId}`);
    } else {
      this.logger.warn(`[linkReservation] 未找到推广记录 visitorUserId=${visitorUserId} reservationId=${reservationId} — 该用户没有推广点击记录`);
    }
  }

  /** 标记推广预约已核销 */
  async markVerified(reservationId: number) {
    await this.recordRepo.update({ reservationId }, { verified: true });
  }

  /** 通过预约ID查找推广记录，标记核销 */
  async markVerifiedByReservation(reservationId: number) {
    const record = await this.recordRepo.findOne({ where: { reservationId } });
    if (record) {
      record.verified = true;
      await this.recordRepo.save(record);
      this.logger.log(`[markVerifiedByReservation] 核销标记成功 reservationId=${reservationId} recordId=${record.id} promoterId=${record.promoterId}`);
    } else {
      this.logger.warn(`[markVerifiedByReservation] 未找到推广记录 reservationId=${reservationId} — 该预约可能不是通过推广产生的`);
    }
  }

  /** 获取推广统计（按时间筛选，区分个人/团队预约与核销） */
  async getStats(promoterId: number, startDate?: string, endDate?: string) {
    const where: any = { promoterId };
    if (startDate && endDate) {
      where.clickedAt = Between(new Date(startDate), new Date(endDate + 'T23:59:59'));
    } else if (startDate) {
      where.clickedAt = MoreThanOrEqual(new Date(startDate));
    } else if (endDate) {
      where.clickedAt = LessThanOrEqual(new Date(endDate + 'T23:59:59'));
    }

    const records = await this.recordRepo.find({ where });

    // 收集有预约关联的记录，查询预约类型（个人/团队）
    const reservationIds = records.filter(r => r.reservationId).map(r => r.reservationId);
    const reservationMap = new Map<string, string>();
    if (reservationIds.length > 0) {
      const reservations = await this.dataSource.getRepository(Reservation).find({
        where: { id: In(reservationIds) },
        select: ['id', 'type'],
      });
      reservations.forEach(r => reservationMap.set(String(r.id), r.type));
    }

    this.logger.log(`[getStats] promoterId=${promoterId} 总记录=${records.length} 有关联预约=${reservationIds.length} 已核销=${records.filter(r => r.verified).length} reservationMap大小=${reservationMap.size}`);

    // 按预约类型拆分统计
    let personalReservations = 0;
    let teamReservations = 0;
    let personalVerified = 0;
    let teamVerified = 0;

    for (const r of records) {
      if (!r.reservationId) continue;
      const type = reservationMap.get(String(r.reservationId));
      if (type === 'PERSONAL') {
        personalReservations++;
        if (r.verified) personalVerified++;
      } else if (type === 'TEAM') {
        teamReservations++;
        if (r.verified) teamVerified++;
      } else {
        this.logger.warn(`[getStats] reservationId=${r.reservationId} 未在reservationMap中找到类型 type=${type} verified=${r.verified}`);
      }
    }

    this.logger.log(`[getStats] 统计结果: 个人预约=${personalReservations} 团队预约=${teamReservations} 个人核销=${personalVerified} 团队核销=${teamVerified}`);

    return {
      totalClicks: records.length,
      totalRegisters: records.filter(r => r.visitorUserId).length,
      totalReservations: records.filter(r => r.reservationId).length,
      totalVerified: records.filter(r => r.verified).length,
      totalReservationsPersonal: personalReservations,
      totalReservationsTeam: teamReservations,
      totalVerifiedPersonal: personalVerified,
      totalVerifiedTeam: teamVerified,
    };
  }

  /** 获取推广员详细业绩统计（按日期范围，支持搜索） */
  async getDetailedStats(
    startDate?: string,
    endDate?: string,
    promoterId?: number,
    searchType?: string,
    keyword?: string,
  ) {
    const userRepo = this.dataSource.getRepository(User);
    const reservationRepo = this.dataSource.getRepository(Reservation);

    // 查询推广员列表
    const qb = userRepo.createQueryBuilder('u').where('u.isPromoter = :isPromoter', { isPromoter: true });
    if (promoterId) {
      qb.andWhere('u.id = :promoterId', { promoterId });
    }
    if (keyword && keyword.trim()) {
      if (searchType === 'phone') {
        qb.andWhere('u.phone LIKE :kw', { kw: `%${keyword.trim()}%` });
      } else {
        qb.andWhere('u.nickname LIKE :kw', { kw: `%${keyword.trim()}%` });
      }
    }
    const promoters = await qb.orderBy('u.id', 'ASC').getMany();

    const results: any[] = [];

    for (const promoter of promoters) {
      // 个人预约统计（直接从 reservations 表查 promoterId）
      const personalQb = reservationRepo.createQueryBuilder('r')
        .select([
          'COUNT(r.id) AS count',
          'COALESCE(SUM(r.visitorCount), 0) AS totalVisitors',
          'COALESCE(SUM(r.childrenCount), 0) AS totalChildren',
          `COALESCE(SUM(CASE WHEN r.visitorType = 'ON_ISLAND' THEN r.visitorCount ELSE 0 END), 0) AS islandCount`,
          `COALESCE(SUM(CASE WHEN r.visitorType = 'OFF_ISLAND' THEN r.visitorCount ELSE 0 END), 0) AS offIslandCount`,
          `COALESCE(SUM(CASE WHEN r.status = 'VERIFIED' THEN 1 ELSE 0 END), 0) AS verifiedCount`,
          `COALESCE(SUM(CASE WHEN r.status = 'VERIFIED' THEN r.visitorCount ELSE 0 END), 0) AS verifiedVisitors`,
        ])
        .where('r.promoterId = :promoterId', { promoterId: promoter.id })
        .andWhere('r.type = :type', { type: 'PERSONAL' });

      if (startDate) personalQb.andWhere('r.reservationDate >= :startDate', { startDate });
      if (endDate) personalQb.andWhere('r.reservationDate <= :endDate', { endDate });

      const personalRaw: any = await personalQb.getRawOne();

      // 个人实到人数（从 verification_records 关联）
      const actualQb = reservationRepo.createQueryBuilder('r')
        .select('COALESCE(SUM(vr.actualCount), 0)', 'actualTotal')
        .innerJoin('verification_records', 'vr', 'vr.reservationId = r.id')
        .where('r.promoterId = :promoterId', { promoterId: promoter.id })
        .andWhere('r.type = :type', { type: 'PERSONAL' });

      if (startDate) actualQb.andWhere('r.reservationDate >= :startDate', { startDate });
      if (endDate) actualQb.andWhere('r.reservationDate <= :endDate', { endDate });

      const actualRaw: any = await actualQb.getRawOne();

      // 团队预约统计（通过 promotion_records 关联）
      const teamQb = this.recordRepo.createQueryBuilder('pr')
        .select([
          'COUNT(DISTINCT r.id) AS count',
          'COALESCE(SUM(r.visitorCount), 0) AS totalVisitors',
          `COALESCE(SUM(CASE WHEN r.status = 'VERIFIED' THEN 1 ELSE 0 END), 0) AS verifiedCount`,
          `COALESCE(SUM(CASE WHEN r.status = 'VERIFIED' THEN r.visitorCount ELSE 0 END), 0) AS verifiedVisitors`,
          `COALESCE(SUM(CASE WHEN r.visitorType = 'ON_ISLAND' THEN r.visitorCount ELSE 0 END), 0) AS teamIslandCount`,
          `COALESCE(SUM(CASE WHEN r.visitorType = 'OFF_ISLAND' THEN r.visitorCount ELSE 0 END), 0) AS teamOffIslandCount`,
        ])
        .innerJoin('reservations', 'r', 'pr.reservationId = r.id')
        .where('pr.promoterId = :promoterId', { promoterId: promoter.id })
        .andWhere('r.type = :type', { type: 'TEAM' });

      if (startDate) teamQb.andWhere('r.reservationDate >= :startDate', { startDate });
      if (endDate) teamQb.andWhere('r.reservationDate <= :endDate', { endDate });

      const teamRaw: any = await teamQb.getRawOne();

      const personalReservations = Number(personalRaw?.count) || 0;
      const personalVisitors = Number(personalRaw?.totalVisitors) || 0;
      const personalVerified = Number(personalRaw?.verifiedCount) || 0;
      const personalVerifiedVisitors = Number(personalRaw?.verifiedVisitors) || 0;
      const actualTotal = Number(actualRaw?.actualTotal) || 0;
      const totalChildren = Number(personalRaw?.totalChildren) || 0;
      const islandCount = Number(personalRaw?.islandCount) || 0;
      const offIslandCount = Number(personalRaw?.offIslandCount) || 0;

      const teamReservations = Number(teamRaw?.count) || 0;
      const teamVisitors = Number(teamRaw?.totalVisitors) || 0;
      const teamVerified = Number(teamRaw?.verifiedCount) || 0;
      const teamVerifiedVisitors = Number(teamRaw?.verifiedVisitors) || 0;
      const teamIslandCount = Number(teamRaw?.teamIslandCount) || 0;
      const teamOffIslandCount = Number(teamRaw?.teamOffIslandCount) || 0;

      const totalReservations = personalReservations + teamReservations;
      const totalVerified = personalVerified + teamVerified;

      results.push({
        promoterId: promoter.id,
        promoterName: promoter.nickname || '',
        promoterPhone: promoter.phone || '',
        shortCode: promoter.shortCode || '',
        // 预约人数
        personalReservations,
        teamReservations,
        totalReservations,
        // 预约人次
        personalVisitors,
        teamVisitors,
        totalVisitors: personalVisitors + teamVisitors,
        // 实到人数
        personalActualVisitors: actualTotal,
        teamActualVisitors: teamVerifiedVisitors,
        totalActualVisitors: actualTotal + teamVerifiedVisitors,
        // 核销单数
        personalVerified,
        teamVerified,
        totalVerified,
        // 核销率
        verificationRate: totalReservations > 0
          ? Math.round(totalVerified / totalReservations * 10000) / 100
          : 0,
        // 大人/小孩（仅个人预约有明细）
        adultVisitors: personalVisitors - totalChildren,
        childrenVisitors: totalChildren,
        // 岛内/岛外（个人+团队，按人数统计）
        islandCount: islandCount + teamIslandCount,
        offIslandCount: offIslandCount + teamOffIslandCount,
      });
    }

    return results;
  }

  /** 导出推广员业绩 CSV */
  async exportStatsCsv(startDate?: string, endDate?: string): Promise<string> {
    const stats = await this.getDetailedStats(startDate, endDate);

    // BOM for Excel UTF-8 compatibility
    const BOM = '﻿';
    const headers = [
      '推广员姓名', '短码', '手机号',
      '个人预约数', '团队预约数', '预约总数',
      '个人预约人次', '团队预约人次', '预约总人次',
      '个人实到人数', '团队实到人数', '实到总人数',
      '个人核销单数', '团队核销单数', '核销总单数',
      '核销率(%)',
      '成人数', '儿童数',
      '岛内人数', '岛外人数',
    ];

    const escapeField = (v: any) => {
      const s = String(v ?? '');
      // 包含逗号、引号或换行时需要用引号包裹
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = stats.map((s: any) => [
      s.promoterName, s.shortCode, s.promoterPhone,
      s.personalReservations, s.teamReservations, s.totalReservations,
      s.personalVisitors, s.teamVisitors, s.totalVisitors,
      s.personalActualVisitors, s.teamActualVisitors, s.totalActualVisitors,
      s.personalVerified, s.teamVerified, s.totalVerified,
      s.verificationRate,
      s.adultVisitors, s.childrenVisitors,
      s.islandCount, s.offIslandCount,
    ].map(escapeField).join(','));

    // 合计行
    const sum = (field: string) => stats.reduce((acc: number, s: any) => acc + (Number(s[field]) || 0), 0);
    const totalRow = [
      '合计', '', '',
      sum('personalReservations'), sum('teamReservations'), sum('totalReservations'),
      sum('personalVisitors'), sum('teamVisitors'), sum('totalVisitors'),
      sum('personalActualVisitors'), sum('teamActualVisitors'), sum('totalActualVisitors'),
      sum('personalVerified'), sum('teamVerified'), sum('totalVerified'),
      '',
      sum('adultVisitors'), sum('childrenVisitors'),
      sum('islandCount'), sum('offIslandCount'),
    ].map(escapeField).join(',');

    return BOM + [headers.join(','), ...rows, totalRow].join('\n');
  }

  /** 获取推广记录明细（按时间筛选） */
  async getRecords(promoterId: number, page = 1, pageSize = 20, startDate?: string, endDate?: string) {
    const qb = this.recordRepo.createQueryBuilder('r')
      .where('r.promoterId = :promoterId', { promoterId });

    if (startDate) {
      qb.andWhere('r.clickedAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere('r.clickedAt <= :endDate', { endDate: new Date(endDate + 'T23:59:59') });
    }

    const total = await qb.getCount();
    const records = await qb
      .orderBy('r.clickedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { records, total, page, pageSize };
  }

  // ========== 推广员申请 ==========

  /** 提交推广申请（扫码后调用） */
  async applyPromoter(userId: number) {
    const existing = await this.applicationRepo.findOne({ where: { userId } });
    if (existing) {
      if (existing.status === 'PENDING') throw new BadRequestException('申请已提交，请等待审核');
      if (existing.status === 'APPROVED') throw new BadRequestException('你已是推广员');
      existing.status = 'PENDING';
      existing.remark = '';
      return this.applicationRepo.save(existing);
    }
    return this.applicationRepo.save(
      this.applicationRepo.create({ userId, status: 'PENDING' }),
    );
  }

  /** 获取申请列表 */
  async getApplications(status?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (status) where.status = status;
    const [records, total] = await this.applicationRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
    return { records, total, page, pageSize };
  }

  /** 审核通过 */
  async approveApplication(id: number, adminId: number) {
    const app = await this.applicationRepo.findOne({ where: { id } });
    if (!app) throw new BadRequestException('申请不存在');
    app.status = 'APPROVED';
    app.approvedBy = adminId;
    await this.applicationRepo.save(app);
    // 更新 user.isPromoter, 并生成唯一短码
    const userRepo = this.dataSource.getRepository(User);
    let shortCode: string;
    do {
      shortCode = crypto.randomBytes(4).toString('hex');
    } while (await userRepo.findOne({ where: { shortCode } }));
    await userRepo.update(app.userId, { isPromoter: true, shortCode });
    return app;
  }

  /** 审核驳回 */
  async rejectApplication(id: number, adminId: number, remark?: string) {
    const app = await this.applicationRepo.findOne({ where: { id } });
    if (!app) throw new BadRequestException('申请不存在');
    app.status = 'REJECTED';
    app.approvedBy = adminId;
    app.remark = remark || '';
    return this.applicationRepo.save(app);
  }

  /** 获取推广员列表（含统计数据） */
  async getPromoters(page = 1, pageSize = 20) {
    const userRepo = this.dataSource.getRepository(User);
    const [records, total] = await userRepo.findAndCount({
      where: { isPromoter: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { updatedAt: 'DESC' as const },
    });

    const list: any[] = [];
    for (const user of records) {
      const stats = await this.getStats(user.id);
      list.push({ ...user, stats });
    }

    return { records: list, total, page, pageSize };
  }

  /** 取消推广员资格 */
  async removePromoter(userId: number) {
    await this.dataSource.getRepository(User).update(userId, { isPromoter: false, shortCode: null as any });
    await this.applicationRepo.update({ userId, status: 'APPROVED' }, { status: 'REJECTED', remark: '管理员取消推广资格' });
  }

  private readonly logger = new Logger(PromotionService.name);

  /** 生成推广邀请二维码（优先使用微信 wxacode.get，失败则降级） */
  async generatePromoterQrCode(): Promise<{ token: string; qrcode: string; appId: number }> {
    const token = crypto.randomBytes(12).toString('hex');
    const app = this.applicationRepo.create({
      userId: 0,
      status: 'PENDING',
      token,
    });
    const saved = await this.applicationRepo.save(app);

    let qrDataUrl: string;
    try {
      // 方案一：wxacode.get（path 直接带 query 参数，支持最长 128 字节）
      const buffer = await this.wechatService.generateQrCode(
        `pages/promotion-apply/index?token=${token}`,
      );
      qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (err1) {
      try {
        // 方案二：wxacode.getUnlimited
        const buffer = await this.wechatService.generateWxCode(
          token,
          'pages/promotion-apply/index',
        );
        qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
      } catch (err2) {
        this.logger.error(`微信小程序码生成全部失败: ${err1.message} / ${err2.message}`);
        throw new BadRequestException('小程序码生成失败，请稍后重试');
      }
    }

    return { token, qrcode: qrDataUrl, appId: saved.id };
  }

  /** 通过 token 查找申请并绑定用户 */
  async bindApplicationByToken(token: string, userId: number) {
    const app = await this.applicationRepo.findOne({ where: { token, status: 'PENDING' } });
    if (!app) throw new BadRequestException('二维码无效或已过期');

    if (app.userId && app.userId !== userId) {
      // 二维码已绑定给其他用户 → 重新创建一条新申请给当前用户
      const newApp = this.applicationRepo.create({ userId, status: 'PENDING' });
      return this.applicationRepo.save(newApp);
    }

    // 首次绑定或同一用户重复扫码
    app.userId = userId;
    await this.applicationRepo.save(app);
    return app;
  }

  // ========== 推广海报 ==========

  /** 获取所有海报模板 */
  async getPosters() {
    return this.posterRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** 创建海报模板 */
  async createPoster(data: { name: string; backgroundUrl: string; textConfig: string; qrConfig: string }) {
    const poster = this.posterRepo.create(data);
    return this.posterRepo.save(poster);
  }

  /** 更新海报模板 */
  async updatePoster(id: number, data: Partial<PromotionPoster>) {
    const poster = await this.posterRepo.findOne({ where: { id } });
    if (!poster) throw new BadRequestException('海报不存在');
    Object.assign(poster, data);
    // 保存后 updatedAt 自动刷新 → 下次 generatePosterImage 的缓存 key 自动变化
    return this.posterRepo.save(poster);
  }

  /** 激活海报（同时停用其他） */
  async activatePoster(id: number) {
    await this.posterRepo.update({ isActive: true }, { isActive: false });
    await this.posterRepo.update(id, { isActive: true });
    return { success: true };
  }

  /** 删除海报（不能删除激活中的） */
  async deletePoster(id: number) {
    const poster = await this.posterRepo.findOne({ where: { id } });
    if (!poster) throw new BadRequestException('海报不存在');
    if (poster.isActive) throw new BadRequestException('请先停用再删除');
    await this.posterRepo.delete(id);
    return { success: true };
  }

  /** 获取当前激活的海报 */
  async getActivePoster() {
    return this.posterRepo.findOne({ where: { isActive: true } });
  }

  /** 海报缓存版本号 — 修改海报生成逻辑后 bump 此值强制全局刷新 */
  private readonly POSTER_CACHE_VERSION = 3;

  /** 生成推广员专属海报图片（带本地缓存 + COS 存储） */
  async generatePosterImage(promoterId: number): Promise<{ url: string }> {
    const poster = await this.getActivePoster();
    if (!poster) throw new BadRequestException('暂未配置推广海报');

    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    const postersDir = path.join(uploadsDir, 'posters');
    if (!fs.existsSync(postersDir)) {
      fs.mkdirSync(postersDir, { recursive: true });
    }

    // 缓存 key = promoterId + posterId + 缓存版本 + 模板更新时间 → 任一变化自动刷新
    const filename = `poster_${promoterId}_${poster.id}_v${this.POSTER_CACHE_VERSION}_${new Date(poster.updatedAt).getTime()}.png`;
    const outputPath = path.join(postersDir, filename);
    const cosKey = `uploads/posters/${filename}`;

    // 本地缓存命中 → 直接返回 COS URL
    if (fs.existsSync(outputPath)) {
      return { url: `${this.cosService.baseUrl}/${cosKey}` };
    }

    // 1. 加载背景图（支持 COS URL / 外部 HTTP URL / 本地路径）
    const bgBuffer = await this.loadImageBuffer(poster.backgroundUrl);

    try {
      // 2. 获取背景图尺寸
      const bgMetadata = await sharp(bgBuffer).metadata();
      const bgWidth = bgMetadata.width || 750;
      const bgHeight = bgMetadata.height || 1334;

      // 3. 生成小程序二维码（getUnlimited — 不受发布状态影响，比 wxacode.get 更稳定）
      const qrConfig = JSON.parse(poster.qrConfig || '{}');
      const qrBuffer = await this.wechatService.generateWxCode(
        String(promoterId),
        'pages/home/index',
      );
      const qrSize = qrConfig.size || 200;
      const qrResized = await sharp(qrBuffer).resize(qrSize, qrSize).png().toBuffer();

      // 4. 构建文字 SVG overlay
      const textConfig: Array<{
        content: string; x: number; y: number; fontSize: number;
        color: string; fontWeight: string; textAlign: string;
      }> = JSON.parse(poster.textConfig || '[]');

      const svgTexts = textConfig.map((t) => {
        const anchor = t.textAlign === 'center' ? 'middle' : t.textAlign === 'right' ? 'end' : 'start';
        return `<text x="${t.x}" y="${t.y}" font-size="${t.fontSize}" fill="${t.color}" font-weight="${t.fontWeight || 'normal'}" text-anchor="${anchor}" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif">${t.content}</text>`;
      }).join('\n');

      const svgOverlay = `<svg width="${bgWidth}" height="${bgHeight}" xmlns="http://www.w3.org/2000/svg">${svgTexts}</svg>`;

      // 5. 合成：背景 + 文字SVG + 二维码
      const qrX = qrConfig.x || 0;
      const qrY = qrConfig.y || 0;

      const resultBuffer = await sharp(bgBuffer)
        .composite([
          { input: Buffer.from(svgOverlay), top: 0, left: 0 },
          { input: qrResized, top: qrY, left: qrX },
        ])
        .png()
        .toBuffer();

      // 6. 原子写入（防 PM2 集群竞态）+ 上传 COS
      const tmpPath = outputPath + '.' + Date.now() + '.tmp';
      fs.writeFileSync(tmpPath, resultBuffer);
      fs.renameSync(tmpPath, outputPath);
      await this.cosService.upload(cosKey, resultBuffer, 'image/png');

      // 7. 清理同 promoter+poster 的旧版本缓存（避免磁盘堆积）
      this.cleanupStaleCache(postersDir, promoterId, poster.id, filename);

      return { url: `${this.cosService.baseUrl}/${cosKey}` };
    } catch (err: any) {
      this.logger.error('海报合成失败', err);
      throw new BadRequestException('海报生成失败: ' + (err.message || '未知错误'));
    }
  }

  /** 清理同一 promoter+poster 的旧版本缓存文件 */
  private cleanupStaleCache(postersDir: string, promoterId: number, posterId: number, currentFilename: string) {
    try {
      const prefix = `poster_${promoterId}_${posterId}_v`;
      const files = fs.readdirSync(postersDir);
      for (const file of files) {
        if (file.startsWith(prefix) && file !== currentFilename) {
          fs.unlinkSync(path.join(postersDir, file));
        }
      }
    } catch (err) {
      this.logger.warn('清理旧海报缓存失败', err);
    }
  }

  /** 根据 URL 加载图片 Buffer（支持 COS 内部 / HTTP / 本地路径） */
  private async loadImageBuffer(bgUrl: string): Promise<Buffer> {
    // COS 内部 URL → SDK 下载
    const cosKey = this.cosService.keyFromUrl(bgUrl);
    if (cosKey) {
      return this.cosService.download(cosKey);
    }

    // 外部 HTTP/HTTPS URL → HTTP GET
    if (/^https?:\/\//.test(bgUrl)) {
      return new Promise((resolve, reject) => {
        get(bgUrl, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`下载背景图失败: HTTP ${res.statusCode}`));
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        });
      });
    }

    // 本地路径（兼容旧数据 /uploads/xxx）
    const localPath = path.join(
      __dirname, '..', '..', '..', 'uploads',
      bgUrl.replace(/^\/uploads\//, ''),
    );
    if (!fs.existsSync(localPath)) {
      throw new BadRequestException('海报背景图不存在，请联系管理员');
    }
    return fs.readFileSync(localPath);
  }

}
