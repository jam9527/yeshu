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

  /** 新增实名信息（自动执行二要素核验） */
  async create(userId: number, data: Partial<RealNameInfo>): Promise<RealNameInfo> {
    // 仅对身份证类型执行核验
    let idVerified = false;
    let verifyTime: Date | undefined = undefined;
    if ((data.idCardType || 'ID_CARD') === 'ID_CARD' && data.name && data.idCard) {
      const result = await this.verificationService.verify(data.name, data.idCard);
      idVerified = result.verified;
      verifyTime = idVerified ? new Date() : undefined;
    }

    const info = this.repo.create({ ...data, userId, idVerified, verifyTime } as RealNameInfo);
    return this.repo.save(info);
  }

  /** 更新实名信息（自动重新核验） */
  async update(id: number, userId: number, data: Partial<RealNameInfo>): Promise<RealNameInfo> {
    const info = await this.repo.findOne({ where: { id, userId, isDeleted: false } });
    if (!info) throw new NotFoundException('实名信息不存在');

    // 如果姓名或证件号有变更，重新核验
    const newName = data.name ?? info.name;
    const newIdCard = data.idCard ?? info.idCard;
    const newIdCardType = data.idCardType ?? info.idCardType;

    if ((newIdCardType === 'ID_CARD') && (data.name || data.idCard)) {
      const result = await this.verificationService.verify(newName, newIdCard);
      data.idVerified = result.verified;
      data.verifyTime = result.verified ? new Date() : undefined;
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
