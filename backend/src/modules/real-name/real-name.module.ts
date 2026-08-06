import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealNameInfo } from './entities/real-name.entity';
import { RealNameService } from './real-name.service';
import { RealNameController } from './real-name.controller';
import { IdCardVerificationService } from './id-card-verification.service';

/**
 * 实名核验模块
 *
 * 身份证二要素核验使用本地国标校验位算法（GB 11643-1999），
 * 不调用任何第三方付费API。
 */
@Module({
  imports: [TypeOrmModule.forFeature([RealNameInfo])],
  controllers: [RealNameController],
  providers: [RealNameService, IdCardVerificationService],
  exports: [RealNameService, IdCardVerificationService],
})
export class RealNameModule {}
