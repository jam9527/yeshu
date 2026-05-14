import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FrequencyLimit } from './entities/frequency-limit.entity';
import { NoticeConfig } from './entities/notice-config.entity';
import { ReservationTemplate } from './entities/reservation-template.entity';
import { SystemConfig } from './entities/system-config.entity';

/**
 * 预约设置服务
 * 管理日期、配额、频率限制、须知、模板等后台配置
 */
@Injectable()
export class ReservationConfigService {
  constructor(
    @InjectRepository(FrequencyLimit)
    private readonly freqRepo: Repository<FrequencyLimit>,
    @InjectRepository(NoticeConfig)
    private readonly noticeRepo: Repository<NoticeConfig>,
    @InjectRepository(ReservationTemplate)
    private readonly templateRepo: Repository<ReservationTemplate>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
  ) {}

  // -- 频率限制 --
  async getFrequencyLimits() {
    return this.freqRepo.find();
  }

  async createFrequencyLimit(data: Partial<FrequencyLimit>) {
    return this.freqRepo.save(this.freqRepo.create(data));
  }

  async updateFrequencyLimit(id: number, data: Partial<FrequencyLimit>) {
    const item = await this.freqRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('频率限制配置不存在');
    Object.assign(item, data);
    return this.freqRepo.save(item);
  }

  // -- 预约须知 --
  async getNotice(type: string) {
    return this.noticeRepo.findOne({ where: { type } });
  }

  async updateNotice(type: string, content: string, adminId?: number) {
    let notice = await this.noticeRepo.findOne({ where: { type } });
    if (notice) {
      notice.content = content;
      if (adminId) notice.updatedBy = adminId;
    } else {
      notice = this.noticeRepo.create({ type, content, updatedBy: adminId });
    }
    return this.noticeRepo.save(notice);
  }

  // -- 模板管理 --
  async getActiveTemplate() {
    return this.templateRepo.findOne({ where: { isActive: true } });
  }

  async getAllTemplates() {
    return this.templateRepo.find({ order: { createdAt: 'DESC' } });
  }

  async uploadTemplate(data: Partial<ReservationTemplate>) {
    // 如果设置 isActive: true，先将其他模板设为非活跃
    if (data.isActive) {
      await this.templateRepo.update({ isActive: true }, { isActive: false });
    }
    return this.templateRepo.save(this.templateRepo.create(data));
  }

  async updateTemplate(id: number, data: Partial<ReservationTemplate>) {
    const item = await this.templateRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('模板不存在');
    if (data.isActive) {
      await this.templateRepo.update({ isActive: true }, { isActive: false });
    }
    Object.assign(item, data);
    return this.templateRepo.save(item);
  }

  async deleteTemplate(id: number) {
    await this.templateRepo.delete(id);
  }

  // -- 系统配置 --
  async getConfig(key: string): Promise<string | null> {
    const config = await this.systemConfigRepo.findOne({ where: { configKey: key } });
    return config?.configValue ?? null;
  }

  async setConfig(key: string, value: string, description?: string): Promise<void> {
    let config = await this.systemConfigRepo.findOne({ where: { configKey: key } });
    if (config) {
      config.configValue = value;
      if (description) config.description = description;
    } else {
      config = this.systemConfigRepo.create({ configKey: key, configValue: value, description });
    }
    await this.systemConfigRepo.save(config);
  }
}
