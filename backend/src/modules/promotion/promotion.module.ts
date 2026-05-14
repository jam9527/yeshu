import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionRecord } from './entities/promotion-record.entity';
import { PromoterApplication } from './entities/promoter-application.entity';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { AdminPromoterController } from './admin-promoter.controller';
import { WechatModule } from '../wechat/wechat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromotionRecord, PromoterApplication]),
    forwardRef(() => WechatModule),
  ],
  controllers: [PromotionController, AdminPromoterController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
