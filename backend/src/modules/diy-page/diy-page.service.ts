import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiyPage } from './entities/diy-page.entity';

/** 递归将配置中 /uploads/ 开头的 URL 转为绝对路径 */
function resolveImageUrls(obj: any, baseUrl: string): any {
  if (typeof obj === 'string' && obj.startsWith('/uploads/')) {
    return `${baseUrl}${obj}`;
  }
  if (Array.isArray(obj)) return obj.map(item => resolveImageUrls(item, baseUrl));
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = resolveImageUrls(obj[key], baseUrl);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class DiyPageService {
  constructor(
    @InjectRepository(DiyPage)
    private readonly repo: Repository<DiyPage>,
  ) {}

  /** 获取启用的页面配置（供小程序端渲染） */
  async getActive(pageKey: string = 'home', baseUrl?: string) {
    const page = await this.repo.findOne({
      where: { pageKey, isActive: true },
      order: { version: 'DESC' },
    });
    if (!page) {
      // 没有配置时返回空结构，前端使用默认渲染
      return { pageKey, config: { components: [] }, version: 0 };
    }
    let config = page.config;
    if (baseUrl) {
      config = resolveImageUrls(config, baseUrl);
    }
    return { pageKey: page.pageKey, config, version: page.version };
  }

  /** 获取所有版本列表（管理后台） */
  async findAll(pageKey: string = 'home') {
    return this.repo.find({
      where: { pageKey },
      order: { version: 'DESC' },
    });
  }

  /** 获取单条配置 */
  async findOne(id: number) {
    const page = await this.repo.findOne({ where: { id } });
    if (!page) throw new NotFoundException('页面配置不存在');
    return page;
  }

  /** 创建新版本 */
  async create(data: { pageKey: string; name: string; config: object }) {
    if (!data.config || !Array.isArray((data.config as any).components)) {
      throw new BadRequestException('config 必须包含 components 数组');
    }

    // 自动版本号
    const last = await this.repo.findOne({
      where: { pageKey: data.pageKey },
      order: { version: 'DESC' },
    });
    const version = (last?.version || 0) + 1;

    const page = this.repo.create({
      pageKey: data.pageKey,
      name: data.name,
      config: data.config,
      version,
    });
    return this.repo.save(page);
  }

  /** 更新配置 */
  async update(id: number, data: { name?: string; config?: object }) {
    const page = await this.findOne(id);
    if (data.config && !Array.isArray((data.config as any).components)) {
      throw new BadRequestException('config 必须包含 components 数组');
    }
    Object.assign(page, data);
    return this.repo.save(page);
  }

  /** 发布（启用某版本，禁用其他版本） */
  async publish(id: number) {
    const page = await this.findOne(id);

    // 禁用该 pageKey 的所有版本
    await this.repo.update(
      { pageKey: page.pageKey },
      { isActive: false },
    );

    // 启用目标版本
    page.isActive = true;
    return this.repo.save(page);
  }

  /** 删除 */
  async remove(id: number) {
    const page = await this.findOne(id);
    return this.repo.remove(page);
  }
}
