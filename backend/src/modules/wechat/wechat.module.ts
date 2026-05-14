import { Module, forwardRef } from '@nestjs/common';
import { WechatService } from './wechat.service';
import { WechatController } from './wechat.controller';
import { UserModule } from '../user/user.module';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [
    UserModule,
    forwardRef(() => PromotionModule),
  ],
  controllers: [WechatController],
  providers: [WechatService],
  exports: [WechatService],
})
export class WechatModule {}
