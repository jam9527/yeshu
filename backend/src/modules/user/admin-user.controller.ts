import { Controller, Get, Put, Param, Query, ParseBoolPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * 管理后台 - 用户管理接口
 */
@AdminPermissions('user:manage')
@Controller('admin')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  /** GET /api/admin/users - 用户列表 */
  @Get('users')
  async getUsers(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    const [records, total] = await this.userService.findAll(page, pageSize);
    return { records, total, page, pageSize };
  }

  /** PUT /api/admin/users/:id/blacklist - 设置/移出黑名单 */
  @Put('users/:id/blacklist')
  async toggleBlacklist(
    @Param('id') id: number,
    @Query('isBlacklisted') isBlacklisted: boolean,
  ) {
    await this.userService.update(id, { isBlacklisted } as any);
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
    await this.userService.update(id, { isPromoter } as any);
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
