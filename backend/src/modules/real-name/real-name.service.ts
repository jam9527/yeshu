import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealNameInfo } from './entities/real-name.entity';
import { IdCardVerificationService } from './id-card-verification.service';

/**
 * 实名信息服务
 * 管理用户的常用参观人信息，支持快捷选择
 * 新增/编辑时自动执行二要素核验
 */
@Injectable()
export class RealNameService {
  constructor(
    @InjectRepository(RealNameInfo)
    private readonly repo: Repository<RealNameInfo>,
    private readonly verificationService: IdCardVerificationService,
  ) {}

  /** 获取用户的所有实名信息 */
  async findByUserId(userId: number): Promise<RealNameInfo[]> {
    return this.repo.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /** 获取单条实名信息 */
  async findOne(id: number, userId: number): Promise<RealNameInfo> {
    const info = await this.repo.findOne({ where: { id, userId, isDeleted: false } });
    if (!info) throw new NotFoundException('实名信息不存在');
    return info;
  }

  /** 新增实名信息（自动执行二要素核验，已有核验记录则跳过API） */
  async create(userId: number, data: Partial<RealNameInfo>): Promise<RealNameInfo> {
    let idVerified = false;
    let verifyTime: Date | undefined = undefined;

    if ((data.idCardType || 'ID_CARD') === 'ID_CARD' && data.name && data.idCard) {
      // 去重：检查该姓名+证件号是否已被任何用户核验过
      const existing = await this.repo.findOne({
        where: { name: data.name, idCard: data.idCard, idVerified: true, isDeleted: false },
      });
      if (existing) {
        idVerified = true;
        verifyTime = existing.verifyTime;
      } else {
        const result = await this.verificationService.verify(data.name, data.idCard);
        idVerified = result.verified;
        verifyTime = idVerified ? new Date() : undefined;
      }
    }

    const info = this.repo.create({ ...data, userId, idVerified, verifyTime } as RealNameInfo);
    return this.repo.save(info);
  }

  /** 更新实名信息（自动重新核验，已有核验记录或数据未变则跳过API） */
  async update(id: number, userId: number, data: Partial<RealNameInfo>): Promise<RealNameInfo> {
    const info = await this.repo.findOne({ where: { id, userId, isDeleted: false } });
    if (!info) throw new NotFoundException('实名信息不存在');

    const newName = data.name ?? info.name;
    const newIdCard = data.idCard ?? info.idCard;
    const newIdCardType = data.idCardType ?? info.idCardType;

    if ((newIdCardType === 'ID_CARD') && (data.name || data.idCard)) {
      // 去重：检查该姓名+证件号是否已被任何用户核验过（含当前记录自身）
      const existing = await this.repo.findOne({
        where: { name: newName, idCard: newIdCard, idVerified: true, isDeleted: false },
      });
      if (existing) {
        data.idVerified = true;
        data.verifyTime = existing.verifyTime;
      } else {
        const result = await this.verificationService.verify(newName, newIdCard);
        data.idVerified = result.verified;
        data.verifyTime = result.verified ? new Date() : undefined;
      }
    }

    Object.assign(info, data);
    return this.repo.save(info);
  }

  /** 删除实名信息（软删除） */
  async softDelete(id: number, userId: number): Promise<void> {
    const result = await this.repo.update(
      { id, userId, isDeleted: false },
      { isDeleted: true },
    );
    if (result.affected === 0) throw new NotFoundException('实名信息不存在');
  }
}
