import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { Activity } from './entities/activity.entity';
import { Banner } from './entities/banner.entity';
import { Faq } from './entities/faq.entity';
import { RedisService } from '../../redis/redis.service';

/**
 * 内容管理服务
 * 提供展厅、活动、Banner、FAQ 的统一 CRUD
 */
@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);

  // Redis 缓存 TTL（秒）
  private readonly CACHE_TTL = 300; // 5 分钟

  constructor(
    @InjectRepository(Exhibition)
    private readonly exhibitionRepo: Repository<Exhibition>,
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.seedFaqs();
  }

  private async seedFaqs() {
    const count = await this.faqRepo.count();
    if (count > 0) return;

    const faqs = [
      { question: '如何预约参观？', answer: '您可以通过微信小程序"椰树集团参观预约"进行预约。个人预约请选择参观日期和场次；团队预约需10人以上，提交后等待管理员审核。', sortOrder: 1 },
      { question: '参观需要收费吗？', answer: '椰树集团参观免费开放，欢迎各界人士前来参观了解。', sortOrder: 2 },
      { question: '参观时间是什么时候？', answer: '上午场：09:00-12:00，下午场：14:00-17:00。具体开放日期请在小程序预约页面查看。', sortOrder: 3 },
      { question: '如何取消预约？', answer: '在"我的预约"中找到对应预约记录，点击"取消预约"按钮。注意：仅参观当天17:00前可取消，逾期将视为过期。', sortOrder: 4 },
      { question: '团队预约最少几个人？', answer: '团队预约最少需要10人。请提前预约并提交相关材料，管理员审核通过后方可参观。', sortOrder: 5 },
      { question: '预约后如何核销？', answer: '到达参观现场后，在"我的预约"中找到对应记录，点击"查看核销码"出示给工作人员扫码核销即可入场。', sortOrder: 6 },
      { question: '可以修改预约信息吗？', answer: '目前暂不支持修改已提交的预约信息。如需更改，请取消原预约后重新提交。', sortOrder: 7 },
      { question: '参观有什么注意事项？', answer: '请遵守厂区秩序，听从工作人员指引，注意安全。厂区内部分区域禁止拍照，请留意现场提示。', sortOrder: 8 },
    ];

    for (const faq of faqs) {
      await this.faqRepo.save(this.faqRepo.create(faq));
    }
    this.logger.log(`已初始化 ${faqs.length} 条常见问题`);
  }

  // ========== 公开接口（小程序端调用） ==========

  /** 获取已发布的 Banner 列表（Redis 缓存 5 分钟） */
  async getBanners() {
    const key = 'cache:content:banners';
    const cached = await this.redis.getJson(key);
    if (cached) return cached;

    const data = await this.bannerRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
    await this.redis.setJson(key, data, this.CACHE_TTL);
    return data;
  }

  /** 获取已发布的展厅列表（Redis 缓存 5 分钟） */
  async getExhibitions() {
    const key = 'cache:content:exhibitions';
    const cached = await this.redis.getJson(key);
    if (cached) return cached;

    const data = await this.exhibitionRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
    await this.redis.setJson(key, data, this.CACHE_TTL);
    return data;
  }

  /** 获取展厅详情 */
  async getExhibition(id: number) {
    const item = await this.exhibitionRepo.findOne({ where: { id, isPublished: true } });
    if (!item) throw new NotFoundException('展厅不存在');
    return item;
  }

  /** 获取已发布的活动列表（Redis 缓存 5 分钟） */
  async getActivities() {
    const key = 'cache:content:activities';
    const cached = await this.redis.getJson(key);
    if (cached) return cached;

    const data = await this.activityRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
    await this.redis.setJson(key, data, this.CACHE_TTL);
    return data;
  }

  /** 获取活动详情 */
  async getActivity(id: number) {
    const item = await this.activityRepo.findOne({ where: { id, isPublished: true } });
    if (!item) throw new NotFoundException('活动不存在');
    return item;
  }

  /** 获取已发布的 FAQ（Redis 缓存 5 分钟） */
  async getFaqs() {
    const key = 'cache:content:faqs';
    const cached = await this.redis.getJson(key);
    if (cached) return cached;

    const data = await this.faqRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
    await this.redis.setJson(key, data, this.CACHE_TTL);
    return data;
  }

  /** 清除内容缓存（管理后台写操作后调用） */
  private async invalidateCache() {
    await this.redis.delPattern('cache:content:*');
  }

  // ========== 管理后台接口 ==========

  // -- 展厅管理 --
  async createExhibition(data: Partial<Exhibition>) {
    await this.invalidateCache();
    return this.exhibitionRepo.save(this.exhibitionRepo.create(data));
  }

  async updateExhibition(id: number, data: Partial<Exhibition>) {
    const item = await this.exhibitionRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('展厅不存在');
    Object.assign(item, data);
    await this.invalidateCache();
    return this.exhibitionRepo.save(item);
  }

  async deleteExhibition(id: number) {
    const result = await this.exhibitionRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('展厅不存在');
    await this.invalidateCache();
  }

  // -- 活动管理 --
  async createActivity(data: Partial<Activity>) {
    await this.invalidateCache();
    return this.activityRepo.save(this.activityRepo.create(data));
  }

  async updateActivity(id: number, data: Partial<Activity>) {
    const item = await this.activityRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('活动不存在');
    Object.assign(item, data);
    await this.invalidateCache();
    return this.activityRepo.save(item);
  }

  async deleteActivity(id: number) {
    const result = await this.activityRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('活动不存在');
    await this.invalidateCache();
  }

  // -- Banner 管理 --
  async createBanner(data: Partial<Banner>) {
    await this.invalidateCache();
    return this.bannerRepo.save(this.bannerRepo.create(data));
  }

  async updateBanner(id: number, data: Partial<Banner>) {
    const item = await this.bannerRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Banner不存在');
    Object.assign(item, data);
    await this.invalidateCache();
    return this.bannerRepo.save(item);
  }

  async deleteBanner(id: number) {
    const result = await this.bannerRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Banner不存在');
    await this.invalidateCache();
  }

  // -- FAQ 管理 --
  async createFaq(data: Partial<Faq>) {
    await this.invalidateCache();
    return this.faqRepo.save(this.faqRepo.create(data));
  }

  async updateFaq(id: number, data: Partial<Faq>) {
    const item = await this.faqRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('FAQ不存在');
    Object.assign(item, data);
    await this.invalidateCache();
    return this.faqRepo.save(item);
  }

  async deleteFaq(id: number) {
    const result = await this.faqRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('FAQ不存在');
    await this.invalidateCache();
  }
}
