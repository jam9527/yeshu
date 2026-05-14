import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * 用户管理服务
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 根据 openid 查找用户 */
  async findByOpenid(openid: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { openid } });
  }

  /** 创建新用户 */
  async create(openid: string): Promise<User> {
    const user = this.userRepo.create({ openid });
    return this.userRepo.save(user);
  }

  /** 查找或创建用户（微信登录流程） */
  async findOrCreate(openid: string): Promise<User> {
    const existing = await this.findByOpenid(openid);
    if (existing) return existing;
    return this.create(openid);
  }

  /** 根据 ID 查找用户 */
  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /** 更新用户信息 */
  async update(id: number, data: Partial<User>): Promise<void> {
    await this.userRepo.update(id, data);
  }

  /** 获取用户列表（管理后台） */
  async findAll(page = 1, pageSize = 10): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
  }
}
