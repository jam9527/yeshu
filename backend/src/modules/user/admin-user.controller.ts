import { Controller, Get, Put, Param, Query, ParseBoolPipe, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * 管理后台 - 用户管理接口
 */
@AdminPermissions('user:manage')
@Controller('admin')
export class AdminUserController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** GET /api/admin/users - 用户列表（支持昵称/手机号模糊搜索） */
  @Get('users')
  async getUsers(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('nickname') nickname?: string,
    @Query('phone') phone?: string,
  ) {
    const [records, total] = await this.userService.findAll(page, pageSize, {
      nickname,
      phone,
    });
    return { records, total, page, pageSize };
  }

  /** PUT /api/admin/users/:id/blacklist - 设置/移出黑名单，可指定拉黑截止日期 */
  @Put('users/:id/blacklist')
  async toggleBlacklist(
    @Param('id') id: number,
    @Body() body?: { isBlacklisted?: boolean; blacklistUntil?: string },
  ) {
    const updateData: any = {};
    if (body?.isBlacklisted !== undefined) {
      updateData.isBlacklisted = body.isBlacklisted;
      // 移出黑名单时清除截止时间
      if (!body.isBlacklisted) {
        updateData.blacklistUntil = null;
        updateData.noShowCount = 0;
      }
    }
    if (body?.blacklistUntil) {
      updateData.blacklistUntil = new Date(body.blacklistUntil);
    }
    await this.userService.update(id, updateData);
    return { success: true };
  }

  /** PUT /api/admin/users/:id/verifier - 设置/取消核销员 */
  @Put('users/:id/verifier')
  async toggleVerifier(
    @Param('id') id: number,
    @Query('isVerifier', ParseBoolPipe) isVerifier: boolean,
  ) {
    await this.userService.update(id, { isVerifier } as any);
    return { success: true };
  }

  /** PUT /api/admin/users/:id/promoter - 设置/取消推广员 */
  @Put('users/:id/promoter')
  async togglePromoter(
    @Param('id') id: number,
    @Query('isPromoter', ParseBoolPipe) isPromoter: boolean,
  ) {
    if (isPromoter) {
      // 生成唯一邀请短码（8位 hex），与 approveApplication 逻辑一致
      let shortCode: string;
      do {
        shortCode = crypto.randomBytes(4).toString('hex');
      } while (await this.userRepo.findOne({ where: { shortCode } }));
      await this.userService.update(id, { isPromoter: true, shortCode } as any);
    } else {
      await this.userService.update(id, { isPromoter: false, shortCode: null } as any);
    }
    return { success: true };
  }

  /** GET /api/admin/blacklist - 黑名单列表 */
  @Get('blacklist')
  async getBlacklist() {
    const [records] = await this.userService.findAll(1, 100);
    const blacklisted = records.filter((u: any) => u.isBlacklisted);
    return blacklisted;
  }
}
