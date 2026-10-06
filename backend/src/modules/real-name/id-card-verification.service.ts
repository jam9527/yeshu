import { Injectable } from '@nestjs/common';

export interface VerificationResult {
  verified: boolean;
  message: string;
}

/**
 * 实名核验服务
 *
 * 证件类型核验策略：
 * - ID_CARD  （内地身份证）：GB 11643-1999 国标实现
 *   1. 格式校验 — 18位数字+校验码（末位允许X）
 *   2. 校验位验证 — ISO 7064:1983 MOD 11-2 加权算法
 *   3. 出生日期校验 — 合法日期范围检查
 *   4. 姓名完整性 — 不少于2个字符
 * - HK_MO_TW （港澳台通行证）：格式校验（回乡证 H/M+8位数字，或台胞证 8位数字）
 * - PASSPORT （护照）：格式校验（字母+数字 5-17位，各国格式不一，宽松校验）
 * - 以上三类均为免费本地校验；通行证/护照无公开校验位算法，仅做格式合规判定
 */
@Injectable()
export class IdCardVerificationService {
  async verify(name: string, idCard: string, idCardType: string = 'ID_CARD'): Promise<VerificationResult> {
    const cleanIdCard = idCard.trim().toUpperCase();
    const type = (idCardType || 'ID_CARD').toUpperCase();

    // 姓名基本校验（所有证件类型通用）
    if (!name || name.trim().length < 2) {
      return { verified: false, message: '姓名不完整' };
    }

    // 内地身份证（GB 11643-1999 国标校验）
    if (type === 'ID_CARD') {
      if (cleanIdCard.length !== 18) {
        return { verified: false, message: '身份证号必须为18位' };
      }
      if (!/^\d{17}[\dX]$/.test(cleanIdCard)) {
        return { verified: false, message: '身份证号格式不正确' };
      }
      if (!this.verifyChecksum(cleanIdCard)) {
        return { verified: false, message: '身份证号校验位不正确' };
      }
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
      return { verified: true, message: '核验通过' };
    }

    // 港澳台通行证（格式校验）
    if (type === 'HK_MO_TW') {
      if (!/^(?:[HM]\d{8}|\d{8})$/.test(cleanIdCard)) {
        return { verified: false, message: '港澳台通行证号码格式不正确' };
      }
      return { verified: true, message: '核验通过' };
    }

    // 护照（格式校验）
    if (type === 'PASSPORT') {
      if (!/^[A-Z0-9]{5,17}$/.test(cleanIdCard)) {
        return { verified: false, message: '护照号码格式不正确' };
      }
      return { verified: true, message: '核验通过' };
    }

    return { verified: false, message: '不支持的证件类型' };
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
