import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OcrProvider } from './id-card-ocr.service';
import { VerificationProvider } from './id-card-verification.service';

interface TencentCredentials {
  secretId: string;
  secretKey: string;
  region: string;
}

/**
 * 腾讯云 OCR + 二要素核验提供商
 *
 * 当 .env 中配置了 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 时自动启用。
 */
@Injectable()
export class TencentCloudProviders implements OcrProvider, VerificationProvider {
  private readonly logger = new Logger(TencentCloudProviders.name);
  private creds: TencentCredentials | null = null;
  private faceidClient: any = null;

  /** 是否已配置腾讯云凭证 */
  get isConfigured(): boolean {
    return this.creds !== null;
  }

  constructor(private configService: ConfigService) {
    this.init();
  }

  private init() {
    const secretId = this.configService.get<string>('TENCENT_SECRET_ID');
    const secretKey = this.configService.get<string>('TENCENT_SECRET_KEY');
    const region = this.configService.get<string>('TENCENT_REGION') || 'ap-guangzhou';

    if (!secretId || !secretKey || secretId === 'your_secret_id') {
      this.logger.warn('腾讯云未配置：TENCENT_SECRET_ID / TENCENT_SECRET_KEY 未设置');
      return;
    }

    this.creds = { secretId, secretKey, region };
    this.logger.log('腾讯云提供商已初始化');
  }

  private getClient() {
    if (!this.creds) return null;
    if (this.faceidClient) return this.faceidClient;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Client } = require('tencentcloud-sdk-nodejs-faceid').faceid.v20180301;
      this.faceidClient = new Client({
        credential: {
          secretId: this.creds.secretId,
          secretKey: this.creds.secretKey,
        },
        region: this.creds.region,
        profile: { httpProfile: { endpoint: 'faceid.tencentcloudapi.com' } },
      });
    } catch (err) {
      this.logger.error('FaceID 客户端初始化失败', err);
    }
    return this.faceidClient;
  }

  // ==================== 身份证 OCR + 二要素核验（合并接口） ====================

  /**
   * 使用腾讯云 IdCardOCRVerification 接口，
   * 上传身份证图片，同时完成 OCR 识别和实名核验。
   */
  async process(imageBuffer: Buffer, _fileName: string) {
    const client = this.getClient();
    if (!client) {
      throw new Error('腾讯云未配置，请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY');
    }

    const base64 = imageBuffer.toString('base64');

    try {
      const result = await client.IdCardOCRVerification({
        ImageBase64: base64,
      });

      const verified = result.Result === '0';
      return {
        name: result.Name || '',
        idCard: result.IdCard || '',
        idCardType: 'ID_CARD',
        verified,
        verificationMessage: result.Description || (verified ? '核验一致' : '核验不一致'),
      };
    } catch (err: any) {
      this.logger.error('腾讯云 IdCardOCRVerification 调用失败', err.message);
      throw new Error(`OCR 识别失败: ${err.message}`);
    }
  }

  // ==================== 二要素核验（文本模式） ====================

  async verify(name: string, idCard: string) {
    const client = this.getClient();
    if (!client) {
      throw new Error('腾讯云未配置，请设置 TENCENT_SECRET_ID 和 TENCENT_SECRET_KEY');
    }

    try {
      const result = await client.IdCardVerification({
        IdCard: idCard,
        Name: name,
      });

      const verified = result.Result === '0';
      return {
        verified,
        message: result.Description || (verified ? '核验通过' : '核验不通过'),
      };
    } catch (err: any) {
      this.logger.error('腾讯云二要素核验失败', err.message);
      return { verified: false, message: `核验服务异常: ${err.message}` };
    }
  }
}
