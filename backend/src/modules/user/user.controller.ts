import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 用户信息接口
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前登录用户信息
   * GET /api/users/me
   */
  @Get('me')
  async getProfile(@CurrentUser('id') userId: number) {
    const user = await this.userService.findById(userId);
    if (!user) return {};
    const { sessionKey, ...profile } = user;
    return profile;
  }

  /**
   * 更新个人资料（昵称、头像）
   * PUT /api/users/me
   */
  @Put('me')
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() data: { nickname?: string; avatarUrl?: string },
  ) {
    await this.userService.update(userId, data);
    return { success: true };
  }
}
