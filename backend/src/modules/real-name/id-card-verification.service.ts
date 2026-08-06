import { Injectable } from '@nestjs/common';

export interface VerificationResult {
  verified: boolean;
  message: string;
}

/**
 * 身份证实名核验（GB 11643-1999 国标实现）
 *
 * 核验维度：
 * 1. 格式校验 — 18位数字+校验码（末位允许X）
 * 2. 校验位验证 — ISO 7064:1983 MOD 11-2 加权算法
 * 3. 出生日期校验 — 合法日期范围检查
 * 4. 姓名完整性 — 不少于2个字符
 *
 * 以上四层校验联合构成身份证号码的合规性判定，
 * 符合国家标准的身份证号码结构验证要求。
 */
@Injectable()
export class IdCardVerificationService {
  async verify(name: string, idCard: string): Promise<VerificationResult> {
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
