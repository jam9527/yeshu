import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';
import { PromotionRecord } from './entities/promotion-record.entity';
import { PromoterApplication } from './entities/promoter-application.entity';
import { User } from '../user/entities/user.entity';
import { WechatService } from '../wechat/wechat.service';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(PromotionRecord)
    private readonly recordRepo: Repository<PromotionRecord>,
    @InjectRepository(PromoterApplication)
    private readonly applicationRepo: Repository<PromoterApplication>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => WechatService))
    private readonly wechatService: WechatService,
  ) {}

  // ========== 推广记录 ==========

  /** 记录分享点击 */
  async recordClick(promoterId: number, visitorOpenid?: string) {
    const record = this.recordRepo.create({
      promoterId,
      visitorOpenid,
      clickedAt: new Date(),
    });
    return this.recordRepo.save(record);
  }

  /** 绑定被推广人用户ID */
  async bindVisitorUser(recordId: number, visitorUserId: number) {
    await this.recordRepo.update(recordId, { visitorUserId });
  }

  /** 关联推广预约 */
  async linkReservation(visitorUserId: number, reservationId: number) {
    await this.recordRepo.update({ visitorUserId }, { reservationId });
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
}
