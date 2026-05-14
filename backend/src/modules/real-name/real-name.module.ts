import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealNameInfo } from './entities/real-name.entity';
import { RealNameService } from './real-name.service';
import { RealNameController } from './real-name.controller';
import { IdCardVerificationService } from './id-card-verification.service';
import { IdCardOcrService } from './id-card-ocr.service';
import { TencentCloudProviders } from './tencent-cloud-providers';

/**
 * 实名核验模块
 *
 * 自动对接腾讯云：
 * - 当 .env 中配置了 TENCENT_SECRET_ID / TENCENT_SECRET_KEY 时，
 *   自动启用腾讯云 OCR + 二要素核验
 * - 未配置时使用本地校验（身份证校验位 + OCR 模拟模式）
 */
@Module({
  imports: [TypeOrmModule.forFeature([RealNameInfo])],
  controllers: [RealNameController],
  providers: [
    RealNameService,
    IdCardVerificationService,
    IdCardOcrService,
    TencentCloudProviders,
    // 自动将 TencentCloudProviders 注入 OCR 和核验服务
    {
      provide: 'TENCENT_INIT',
      inject: [TencentCloudProviders, IdCardVerificationService, IdCardOcrService],
      useFactory: (
        tencent: TencentCloudProviders,
        verification: IdCardVerificationService,
        ocr: IdCardOcrService,
      ) => {
        if (tencent.isConfigured) {
          verification.setProvider(tencent);
          ocr.setProvider(tencent);
        }
        return tencent;
      },
    },
  ],
  exports: [RealNameService, IdCardVerificationService, IdCardOcrService],
})
export class RealNameModule {}
