import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './entities/admin-role.entity';
import { LogService } from '../log/log.service';

/**
 * 管理后台认证服务
 * 账号密码登录，JWT 签发
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    @InjectRepository(AdminRole)
    private readonly roleRepo: Repository<AdminRole>,
    private readonly jwtService: JwtService,
    private readonly logService: LogService,
  ) {}

  /** 管理员登录 */
  async login(username: string, password: string, ip?: string) {
    const admin = await this.adminRepo.findOne({ where: { username, status: 1 } });
    if (!admin) {
      await this.logService.createLoginLog({ username, ip, loginResult: 'FAILED', failReason: '账号不存在' });
      throw new UnauthorizedException('账号或密码错误');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      await this.logService.createLoginLog({ adminUserId: admin.id, username, ip, loginResult: 'FAILED', failReason: '密码错误' });
      throw new UnauthorizedException('账号或密码错误');
    }

    const token = this.jwtService.sign({
      sub: admin.id,
      username: admin.username,
      type: 'admin',
      isSuperAdmin: admin.isSuperAdmin,
    });

    // 更新登录信息
    await this.adminRepo.update(admin.id, {
      lastLoginAt: new Date(),
    });

    // 记录登录日志
    await this.logService.createLoginLog({ adminUserId: admin.id, username, ip, loginResult: 'SUCCESS' });

    return {
      token,
      user: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        isSuperAdmin: admin.isSuperAdmin,
      },
    };
  }

  /** 获取管理员信息 */
  async getProfile(adminId: number) {
    const admin = await this.adminRepo.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('用户不存在');
    const { passwordHash, ...profile } = admin;
    return profile;
  }
}
