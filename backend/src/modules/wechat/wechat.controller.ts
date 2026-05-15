import { Controller, Post, Body } from '@nestjs/common';
import { WechatService } from './wechat.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
   *   encryptedData?: string, // getPhoneNumber 返回的加密数据
   *   iv?: string,            // 加密算法的初始向量
   *   promoterId?: number     // 分享推广人ID
   * }
   */
  @Public()
  @Post('login')
  async login(
    @Body('code') code: string,
    @Body('encryptedData') encryptedData?: string,
    @Body('iv') iv?: string,
    @Body('promoterId') promoterId?: number,
  ) {
    return this.wechatService.login(code, encryptedData, iv, promoterId);
  }

  /**
   * 测试登录（无需微信 code）
   * POST /api/wechat/test-login
   */
  @Public()
  @Post('test-login')
  async testLogin(@Body('username') username?: string) {
    return this.wechatService.testLogin(username);
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
