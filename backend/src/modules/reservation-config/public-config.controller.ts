import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { ReservationConfigService } from './reservation-config.service';

/**
 * 公开配置接口（无需登录）
 * 供小程序登录页等未认证场景使用
 */
@SkipThrottle()
@Public()
@Controller('config')
export class PublicConfigController {
  constructor(private readonly configService: ReservationConfigService) {}

  /** GET /api/config/login-page — 获取登录页自定义配置 */
  @Get('login-page')
  async getLoginPageConfig() {
    const json = await this.configService.getConfig('loginPage');
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }
}
