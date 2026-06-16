import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionRecord } from './entities/promotion-record.entity';
import { PromoterApplication } from './entities/promoter-application.entity';
import { PromotionPoster } from './entities/promotion-poster.entity';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { AdminPromoterController } from './admin-promoter.controller';
import { AdminPosterController } from './admin-poster.controller';
import { WechatModule } from '../wechat/wechat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromotionRecord, PromoterApplication, PromotionPoster]),
    forwardRef(() => WechatModule),
  ],
  controllers: [PromotionController, AdminPromoterController, AdminPosterController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
