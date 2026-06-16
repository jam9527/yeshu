import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, LessThanOrEqual, Between, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { PromotionRecord } from './entities/promotion-record.entity';
import { PromoterApplication } from './entities/promoter-application.entity';
import { PromotionPoster } from './entities/promotion-poster.entity';
import { User } from '../user/entities/user.entity';
import { WechatService } from '../wechat/wechat.service';

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
    }
  }

  /** 获取推广统计（按时间筛选） */
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
    return {
      totalClicks: records.length,
      totalRegisters: records.filter(r => r.visitorUserId).length,
      totalReservations: records.filter(r => r.reservationId).length,
      totalVerified: records.filter(r => r.verified).length,
    };
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
    // 更新 user.isPromoter
    await this.dataSource.getRepository(User).update(app.userId, { isPromoter: true });
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
    await this.dataSource.getRepository(User).update(userId, { isPromoter: false });
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
        // 方案三：降级为普通二维码（仅开发调试用）
        this.logger.warn(`微信小程序码生成失败，降级为普通二维码: ${err1.message} / ${err2.message}`);
        qrDataUrl = await qrcode.toDataURL(token, { width: 300, margin: 2 });
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
    const saved = await this.posterRepo.save(poster);
    // 模板变更后清除缓存，下次请求重新生成
    this.clearPosterCache().catch(() => {});
    return saved;
  }

  /** 激活海报（同时停用其他） */
  async activatePoster(id: number) {
    await this.posterRepo.update({ isActive: true }, { isActive: false });
    await this.posterRepo.update(id, { isActive: true });
    // 切换激活后清除缓存
    this.clearPosterCache().catch(() => {});
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

  /** 生成推广员专属海报图片（带缓存） */
  async generatePosterImage(promoterId: number): Promise<{ url: string }> {
    const poster = await this.getActivePoster();
    if (!poster) throw new BadRequestException('暂未配置推广海报');

    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    const postersDir = path.join(uploadsDir, 'posters');
    const filename = `poster_${promoterId}_${poster.id}.png`;
    const outputPath = path.join(postersDir, filename);

    // 缓存命中直接返回
    if (fs.existsSync(outputPath)) {
      return { url: `/uploads/posters/${filename}` };
    }

    // 1. 加载背景图
    const bgPath = path.join(uploadsDir, poster.backgroundUrl.replace(/^\/uploads\//, ''));
    if (!fs.existsSync(bgPath)) {
      throw new BadRequestException('海报背景图不存在，请联系管理员');
    }

    try {
      // 2. 获取背景图尺寸
      const bgMetadata = await sharp(bgPath).metadata();
      const bgWidth = bgMetadata.width || 750;
      const bgHeight = bgMetadata.height || 1334;

      // 3. 生成小程序二维码
      const qrConfig = JSON.parse(poster.qrConfig || '{}');
      const qrBuffer = await this.wechatService.generateQrCode(
        `pages/home/index?promoterId=${promoterId}`,
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

      await sharp(bgPath)
        .composite([
          { input: Buffer.from(svgOverlay), top: 0, left: 0 },
          { input: qrResized, top: qrY, left: qrX },
        ])
        .png()
        .toFile(outputPath);

      return { url: `/uploads/posters/${filename}` };
    } catch (err: any) {
      this.logger.error('海报合成失败', err);
      throw new BadRequestException('海报生成失败: ' + (err.message || '未知错误'));
    }
  }

  /** 清除海报缓存目录 */
  private async clearPosterCache() {
    const postersDir = path.join(__dirname, '..', '..', '..', 'uploads', 'posters');
    try {
      if (fs.existsSync(postersDir)) {
        const files = fs.readdirSync(postersDir);
        for (const file of files) {
          fs.unlinkSync(path.join(postersDir, file));
        }
      }
    } catch (err) {
      this.logger.warn('清除海报缓存失败', err);
    }
  }
}
