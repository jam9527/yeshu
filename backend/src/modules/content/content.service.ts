import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { Activity } from './entities/activity.entity';
import { Banner } from './entities/banner.entity';
import { Faq } from './entities/faq.entity';

/**
 * 内容管理服务
 * 提供展厅、活动、Banner、FAQ 的统一 CRUD
 */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Exhibition)
    private readonly exhibitionRepo: Repository<Exhibition>,
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
  ) {}

  // ========== 公开接口（小程序端调用） ==========

  /** 获取已发布的 Banner 列表 */
  async getBanners() {
    return this.bannerRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** 获取已发布的展厅列表 */
  async getExhibitions() {
    return this.exhibitionRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** 获取展厅详情 */
  async getExhibition(id: number) {
    const item = await this.exhibitionRepo.findOne({ where: { id, isPublished: true } });
    if (!item) throw new NotFoundException('展厅不存在');
    return item;
  }

  /** 获取已发布的活动列表 */
  async getActivities() {
    return this.activityRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** 获取活动详情 */
  async getActivity(id: number) {
    const item = await this.activityRepo.findOne({ where: { id, isPublished: true } });
    if (!item) throw new NotFoundException('活动不存在');
    return item;
  }

  /** 获取已发布的 FAQ */
  async getFaqs() {
    return this.faqRepo.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ========== 管理后台接口 ==========

  // -- 展厅管理 --
  async createExhibition(data: Partial<Exhibition>) {
    return this.exhibitionRepo.save(this.exhibitionRepo.create(data));
  }

  async updateExhibition(id: number, data: Partial<Exhibition>) {
    const item = await this.exhibitionRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('展厅不存在');
    Object.assign(item, data);
    return this.exhibitionRepo.save(item);
  }

  async deleteExhibition(id: number) {
    const result = await this.exhibitionRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('展厅不存在');
  }

  // -- 活动管理 --
  async createActivity(data: Partial<Activity>) {
    return this.activityRepo.save(this.activityRepo.create(data));
  }

  async updateActivity(id: number, data: Partial<Activity>) {
    const item = await this.activityRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('活动不存在');
    Object.assign(item, data);
    return this.activityRepo.save(item);
  }

  async deleteActivity(id: number) {
    const result = await this.activityRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('活动不存在');
  }

  // -- Banner 管理 --
  async createBanner(data: Partial<Banner>) {
    return this.bannerRepo.save(this.bannerRepo.create(data));
  }

  async updateBanner(id: number, data: Partial<Banner>) {
    const item = await this.bannerRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Banner不存在');
    Object.assign(item, data);
    return this.bannerRepo.save(item);
  }

  async deleteBanner(id: number) {
    const result = await this.bannerRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Banner不存在');
  }

  // -- FAQ 管理 --
  async createFaq(data: Partial<Faq>) {
    return this.faqRepo.save(this.faqRepo.create(data));
  }

  async updateFaq(id: number, data: Partial<Faq>) {
    const item = await this.faqRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('FAQ不存在');
    Object.assign(item, data);
    return this.faqRepo.save(item);
  }

  async deleteFaq(id: number) {
    const result = await this.faqRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('FAQ不存在');
  }
}
