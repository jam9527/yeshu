import { Injectable, Logger } from '@nestjs/common';
import COS = require('cos-nodejs-sdk-v5');

@Injectable()
export class CosService {
  private readonly cos: COS;
  private readonly bucket: string;
  private readonly region: string;
  private readonly logger = new Logger(CosService.name);

  constructor() {
    this.bucket = process.env.COS_BUCKET || '';
    this.region = process.env.TENCENT_REGION || 'ap-guangzhou';

    if (!this.bucket) {
      this.logger.warn('COS_BUCKET 未配置，COS 服务不可用');
    }

    this.cos = new COS({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY,
    });
  }

  /** 获取 COS 对象基础 URL */
  get baseUrl(): string {
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com`;
  }

  /**
   * 上传文件到 COS
   * @param key 对象键（如 uploads/xxx.jpg）
   * @param body 文件内容
   * @param contentType MIME 类型
   * @returns 公开访问 URL
   */
  async upload(key: string, body: Buffer, contentType?: string): Promise<string> {
    if (!this.bucket) throw new Error('COS 未配置');

    return new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: body,
          ContentType: contentType,
          ACL: 'public-read',
        },
        (err) => {
          if (err) {
            this.logger.error(`COS 上传失败: ${key}`, err.message);
            return reject(err);
          }
          resolve(`${this.baseUrl}/${key}`);
        },
      );
    });
  }

  /**
   * 从 COS 下载文件
   * @param key 对象键
   * @returns 文件内容 Buffer
   */
  async download(key: string): Promise<Buffer> {
    if (!this.bucket) throw new Error('COS 未配置');

    return new Promise((resolve, reject) => {
      this.cos.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err, data) => {
          if (err) {
            this.logger.error(`COS 下载失败: ${key}`, err.message);
            return reject(err);
          }
          resolve(data.Body as Buffer);
        },
      );
    });
  }

  /**
   * 检查对象是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.bucket) return false;

    return new Promise((resolve) => {
      this.cos.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          resolve(!err);
        },
      );
    });
  }

  /**
   * 删除 COS 对象
   */
  async delete(key: string): Promise<void> {
    if (!this.bucket) throw new Error('COS 未配置');

    return new Promise((resolve, reject) => {
      this.cos.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          if (err) {
            this.logger.error(`COS 删除失败: ${key}`, err.message);
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  /**
   * 从完整 COS URL 提取对象键
   * @returns 对象键，若 URL 不匹配则返回 null
   */
  keyFromUrl(url: string): string | null {
    const prefix = `${this.baseUrl}/`;
    if (url.startsWith(prefix)) {
      return url.substring(prefix.length);
    }
    return null;
  }
}
