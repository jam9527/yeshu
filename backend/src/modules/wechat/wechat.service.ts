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

  async login(code: string, encryptedData?: string, iv?: string, promoterId?: number, phoneCode?: string) {
    const wxSession = await this.getWechatSession(code);
    const user = await this.userService.findOrCreate(wxSession.openid);

    let phone: string | undefined;
    // 新API: 通过 phoneCode 换取手机号 (base library ≥2.21.2)
    if (phoneCode) {
      try {
        phone = await this.getPhoneNumber(phoneCode);
        this.logger.log(`手机号获取成功(新API): ${phone ? '***'+phone.slice(-4) : '空'}`);
      } catch (err) {
        this.logger.error(`手机号获取失败(新API): ${err.message}`);
      }
    }
    // 旧API兼容: AES解密手机号 (base library <2.21.2)
    if (!phone && encryptedData && iv) {
      try {
        const phoneData = this.decryptPhoneNumber(wxSession.sessionKey, encryptedData, iv);
        phone = phoneData.purePhoneNumber || phoneData.phoneNumber;
        this.logger.log(`手机号解密成功(旧API): ${phone ? '***'+phone.slice(-4) : '空'}`);
      } catch (err) {
        this.logger.error(`手机号解密失败(旧API): ${err.message}`);
      }
    }

    const updateData: any = { sessionKey: wxSession.sessionKey, lastLoginAt: new Date() };
    if (phone) updateData.phone = phone;
    await this.userService.update(user.id, updateData);

    // 推广追踪：记录点击 + 绑定用户（登录时做，避免前端 wx.request 被 redirectTo 取消）
    if (promoterId && promoterId !== user.id) {
      // 1. 先记录推广点击
      await this.promotionService.recordClick(promoterId, user.openid).catch(err => {
        this.logger.warn(`记录推广点击失败: ${err.message}`);
      });
      // 2. 设置用户推广关系
      if (!user.promotedBy) {
        await this.userService.update(user.id, { promotedBy: promoterId } as any);
      }
      // 3. 将访客 userId 绑定到最新的推广点击记录
      await this.promotionService.bindVisitorByLogin(promoterId, user.id, user.openid).catch(err => {
        this.logger.warn(`绑定推广记录失败: ${err.message}`);
      });
    }

    const token = this.jwtService.sign({
      sub: user.id, id: user.id, openid: user.openid, type: 'mini-program',
      isVerifier: user.isVerifier,
    });

    // 如果通过推广海报/链接进入，查推广人的邀请码用于预约时自动填入
    let promoterCode: string | null = null;
    if (promoterId) {
      const promoter = await this.userService.findById(promoterId);
      promoterCode = promoter?.shortCode || null;
    }

    return {
      token,
      user: {
        id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl,
        phone: user.phone || phone || null,
        isVerifier: user.isVerifier, isPromoter: user.isPromoter,
        shortCode: user.shortCode || null,
      },
      promoterCode,
    };
  }

  /** 通过 phoneCode 获取手机号（新API，base library ≥2.21.2） */
  async getPhoneNumber(phoneCode: string): Promise<string | undefined> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
    const res: any = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: phoneCode }),
    }).then(r => r.json());

    if (res.errcode !== 0) {
      throw new Error(`获取手机号失败(errcode=${res.errcode}): ${res.errmsg}`);
    }
    return res.phone_info?.purePhoneNumber || res.phone_info?.phoneNumber;
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

  /** 获取当前环境对应的小程序版本 */
  private getEnvVersion(): string {
    const env = (process.env.MINI_ENV || process.env.NODE_ENV || 'development').toLowerCase();
    if (env === 'production' || env === 'prod') return 'release';
    if (env === 'staging' || env === 'trial') return 'trial';
    return 'develop';
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
        env_version: this.getEnvVersion(),
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
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene,
        page,
        check_path: false,
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
