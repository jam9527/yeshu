import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { PromotionService } from '../promotion/promotion.service';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => PromotionService))
    private readonly promotionService: PromotionService,
  ) {}

  async login(code: string, encryptedData?: string, iv?: string, promoterId?: number) {
    const wxSession = await this.getWechatSession(code);
    const user = await this.userService.findOrCreate(wxSession.openid);

    let phone: string | undefined;
    if (encryptedData && iv) {
      try {
        const phoneData = this.decryptPhoneNumber(wxSession.sessionKey, encryptedData, iv);
        phone = phoneData.purePhoneNumber || phoneData.phoneNumber;
        this.logger.log(`手机号解密成功: ${phone ? '***'+phone.slice(-4) : '空'}`);
      } catch (err) {
        this.logger.error(`手机号解密失败: ${err.message}`);
      }
    }

    const updateData: any = { sessionKey: wxSession.sessionKey, lastLoginAt: new Date() };
    if (phone) updateData.phone = phone;
    await this.userService.update(user.id, updateData);

    if (promoterId && promoterId !== user.id && !user.promotedBy) {
      await this.userService.update(user.id, { promotedBy: promoterId } as any);
    }

    const token = this.jwtService.sign({
      sub: user.id, id: user.id, openid: user.openid, type: 'mini-program',
      isVerifier: user.isVerifier,
    });

    return {
      token,
      user: {
        id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl,
        phone: user.phone || phone || null,
        isVerifier: user.isVerifier, isPromoter: user.isPromoter,
      },
    };
  }

  async testLogin(username?: string) {
    const testOpenid = username
      ? `test_openid_${Buffer.from(username, 'utf-8').toString('hex')}`
      : 'test_openid_yeshu_dev';
    let user = await this.userService.findOrCreate(testOpenid);
    if (!user.nickname) await this.userService.update(user.id, { nickname: '测试用户' });

    const token = this.jwtService.sign({
      sub: user.id, id: user.id, openid: user.openid, type: 'mini-program',
      isVerifier: user.isVerifier,
    });

    return {
      token,
      user: { id: user.id, nickname: user.nickname || '测试用户', avatarUrl: user.avatarUrl, phone: user.phone, isVerifier: user.isVerifier, isPromoter: user.isPromoter },
    };
  }

  /** 获取微信 access token（自动缓存） */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) throw new BadRequestException('微信配置未设置');

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const res: any = await fetch(url).then(r => r.json());

    if (res.errcode) throw new BadRequestException(`获取 access_token 失败: ${res.errmsg}`);

    this.cachedToken = {
      accessToken: res.access_token,
      expiresAt: Date.now() + (res.expires_in - 60) * 1000, // 提前60秒过期
    };
    return this.cachedToken.accessToken;
  }

  /** 生成小程序码（wxacode.get） */
  async generateQrCode(path: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        width: 280,
        check_path: false,
        env_version: 'develop',
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const err: any = await response.json();
      throw new BadRequestException(`生成小程序码失败(errcode=${err.errcode}): ${err.errmsg}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /** 生成小程序码（wxacode.getUnlimited，后备方案） */
  async generateWxCode(scene: string, page: string): Promise<Buffer> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimited?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene,
        page,
        check_path: false,
        env_version: 'develop',
        width: 280,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const err: any = await response.json();
      throw new BadRequestException(`生成小程序码失败(errcode=${err.errcode}): ${err.errmsg}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /** AES-128-CBC 解密（微信加密数据通用方法） */
  private decryptWechatData(sessionKey: string, encryptedData: string, iv: string): any {
    const decipher = crypto.createDecipheriv(
      'aes-128-cbc',
      Buffer.from(sessionKey, 'base64'),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAutoPadding(true);
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(encryptedData, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decoded.toString('utf8'));
  }

  private decryptPhoneNumber(sessionKey: string, encryptedData: string, iv: string): any {
    return this.decryptWechatData(sessionKey, encryptedData, iv);
  }

  /** 解密微信用户信息（昵称、头像）并保存 */
  async decodeAndSaveUserInfo(userId: number, encryptedData: string, iv: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new BadRequestException('用户不存在');
    if (!user.sessionKey) throw new BadRequestException('session_key 已过期，请重新登录');

    try {
      const decoded = this.decryptWechatData(user.sessionKey, encryptedData, iv);
      const nickname = decoded.nickName || decoded.nickname;
      const avatarUrl = decoded.avatarUrl || decoded.avatarUrl || null;
      await this.userService.update(userId, { nickname, avatarUrl });
      this.logger.log(`用户信息解密成功: userId=${userId}, nickname=${nickname}`);
      return { nickname, avatarUrl };
    } catch (err) {
      this.logger.error(`用户信息解密失败: ${err.message}`);
      throw new BadRequestException('用户信息解密失败，请重新登录');
    }
  }

  private async getWechatSession(code: string) {
    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) throw new BadRequestException('微信配置未设置');

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    try {
      const response = await fetch(url);
      const data: any = await response.json();
      if (data.errcode) throw new BadRequestException(`微信登录失败: ${data.errmsg}`);
      return { openid: data.openid as string, sessionKey: data.session_key as string };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('微信服务器请求失败');
    }
  }
}
