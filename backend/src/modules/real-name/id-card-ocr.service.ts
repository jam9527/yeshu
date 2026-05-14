import { Injectable, Logger } from '@nestjs/common';

export interface OcrResult {
  name: string;
  idCard: string;
  idCardType: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  /** 标记是否为模拟数据（开发环境） */
  isSimulated?: boolean;
  /** 腾讯云 IdCardOCRVerification 核验结果（仅生产环境） */
  verified?: boolean;
  /** 核验结果描述 */
  verificationMessage?: string;
}

export interface OcrProvider {
  process(imageBuffer: Buffer, fileName: string): Promise<OcrResult>;
}

/**
 * 身份证 OCR 识别服务
 *
 * 可插拔设计：提供 setProvider() 接入第三方 OCR 服务（腾讯云/阿里云）。
 *
 * ## 生产环境接入腾讯云 OCR
 *
 * ```ts
 * // 在 RealNameModule 中配置
 * const tencentProvider: OcrProvider = {
 *   async process(imageBuffer, fileName) {
 *     const { OcrClient, IDCardOCRRequest } = require('tencentcloud-sdk-nodejs-ocr')
 *     const client = new OcrClient(...)
 *     const result = await client.IDCardOCR({ImageBase64: imageBuffer.toString('base64')})
 *     return {
 *       name: result.Name,
 *       idCard: result.IdNum,
 *       idCardType: 'ID_CARD',
 *       address: result.Address,
 *       birthDate: result.Birth,
 *       gender: result.Gender,
 *     }
 *   }
 * }
 * ocrService.setProvider(tencentProvider)
 * ```
 *
 * ## 开发环境
 * 本地模拟返回格式化的 mock 数据，方便前端联调。
 */
@Injectable()
export class IdCardOcrService {
  private readonly logger = new Logger(IdCardOcrService.name);
  private provider: OcrProvider | null = null;

  setProvider(provider: OcrProvider) {
    this.provider = provider;
  }

  async process(imageBuffer: Buffer, fileName: string): Promise<OcrResult> {
    if (this.provider) {
      return this.provider.process(imageBuffer, fileName);
    }

    this.logger.warn(
      '未配置第三方 OCR 提供商，使用本地模拟模式。' +
        '生产环境请调用 setProvider() 注入腾讯云/阿里云 OCR 服务。',
    );

    return this.simulateOcr(imageBuffer, fileName);
  }

  /**
   * 本地模拟 OCR — 仅开发环境使用
   *
   * 尝试从文件名提取姓名和证件号（用于联调），
   * 如果文件名不包含有效信息则返回空字段。
   */
  private async simulateOcr(
    _imageBuffer: Buffer,
    fileName: string,
  ): Promise<OcrResult> {
    // 尝试从文件名解析模拟数据，格式: 张三_110101199001011234.jpg
    let name = '';
    let idCard = '';

    const match = fileName.match(/^(.+)_(\d{17}[\dXx])/);
    if (match) {
      name = match[1];
      idCard = match[2].toUpperCase();
    }

    return {
      name,
      idCard,
      idCardType: 'ID_CARD',
      isSimulated: true,
    };
  }
}
