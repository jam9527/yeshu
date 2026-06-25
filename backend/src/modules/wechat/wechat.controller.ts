import { Controller, Post, Body } from '@nestjs/common';
import { WechatService } from './wechat.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

/**
 * 微信认证接口
 */
@Controller('wechat')
export class WechatController {
  constructor(private readonly wechatService: WechatService) {}

  /**
   * 微信登录（合并手机号获取）
   * POST /api/wechat/login
   * Body: {
   *   code: string,          // wx.login() 获取的临时 code
   *   phoneCode?: string,     // getPhoneNumber 返回的动态令牌（新API，base library ≥2.21.2）
   *   encryptedData?: string, // getPhoneNumber 返回的加密数据（旧API兼容）
   *   iv?: string,            // 加密算法的初始向量（旧API兼容）
   *   promoterId?: number     // 分享推广人ID
   * }
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // 登录: 20次/分钟/IP
  @Post('login')
  async login(
    @Body('code') code: string,
    @Body('phoneCode') phoneCode?: string,
    @Body('encryptedData') encryptedData?: string,
    @Body('iv') iv?: string,
    @Body('promoterId') promoterId?: number,
  ) {
    return this.wechatService.login(code, encryptedData, iv, promoterId, phoneCode);
  }

  /**
   * 解密用户信息（昵称、头像）
   * POST /api/wechat/decode-userinfo
   * 需要用户点击 <button open-type="getUserInfo"> 授权后调用
   */
  @Post('decode-userinfo')
  async decodeUserInfo(
    @CurrentUser('id') userId: number,
    @Body('encryptedData') encryptedData: string,
    @Body('iv') iv: string,
  ) {
    return this.wechatService.decodeAndSaveUserInfo(userId, encryptedData, iv);
  }
}
