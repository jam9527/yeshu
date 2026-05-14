import { Injectable } from '@nestjs/common';

export interface VerificationResult {
  verified: boolean;
  message: string;
}

/**
 * 身份证二要素核验服务
 *
 * 当前实现基于身份证号码校验位算法（GB 11643-1999）做本地格式校验。
 * 生产环境应替换为腾讯云/阿里云等第三方实名认证API，实现真实的姓名+身份证号匹配核验。
 *
 * 替换方式：实现 VerificationProvider 接口，在此服务中调用即可。
 */
export interface VerificationProvider {
  verify(name: string, idCard: string): Promise<VerificationResult>;
}

/**
 * 本地身份证校验（基于身份证号码格式和校验位）
 * 不保证姓名与身份证号真实匹配，仅做格式层面的校验
 */
@Injectable()
export class IdCardVerificationService {
  private provider: VerificationProvider | null = null;

  /** 设置第三方核验提供商（可选，默认使用本地校验） */
  setProvider(provider: VerificationProvider) {
    this.provider = provider;
  }

  async verify(name: string, idCard: string): Promise<VerificationResult> {
    // 如果有第三方提供商，优先使用
    if (this.provider) {
      return this.provider.verify(name, idCard);
    }

    // 本地校验
    const cleanIdCard = idCard.trim().toUpperCase();

    if (cleanIdCard.length !== 18) {
      return { verified: false, message: '身份证号必须为18位' };
    }

    // 格式校验：前17位必须为数字
    if (!/^\d{17}[\dX]$/.test(cleanIdCard)) {
      return { verified: false, message: '身份证号格式不正确' };
    }

    // 校验位验证（GB 11643-1999）
    if (!this.verifyChecksum(cleanIdCard)) {
      return { verified: false, message: '身份证号校验位不正确' };
    }

    // 出生日期校验
    const birthYear = parseInt(cleanIdCard.substring(6, 10));
    const birthMonth = parseInt(cleanIdCard.substring(10, 12));
    const birthDay = parseInt(cleanIdCard.substring(12, 14));
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

    if (
      birthDate.getFullYear() !== birthYear ||
      birthDate.getMonth() + 1 !== birthMonth ||
      birthDate.getDate() !== birthDay ||
      birthYear < 1900 ||
      birthYear > new Date().getFullYear()
    ) {
      return { verified: false, message: '身份证号出生日期无效' };
    }

    // 姓名基本校验
    if (!name || name.trim().length < 2) {
      return { verified: false, message: '姓名不完整' };
    }

    return { verified: true, message: '核验通过' };
  }

  private verifyChecksum(idCard: string): boolean {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i];
    }

    const mod = sum % 11;
    return idCard[17] === checkCodes[mod];
  }
}
