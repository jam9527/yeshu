import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  /** GET /api/promotion/stats - 推广统计（时间筛选） */
  @Get('stats')
  async getStats(
    @CurrentUser('id') userId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.promotionService.getStats(userId, startDate, endDate);
  }

  /** GET /api/promotion/records - 推广明细（时间筛选） */
  @Get('records')
  async getRecords(
    @CurrentUser('id') userId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.promotionService.getRecords(userId, page, pageSize, startDate, endDate);
  }

  /** POST /api/promotion/apply - 申请成为推广员 */
  @Post('apply')
  async applyPromoter(@CurrentUser('id') userId: number) {
    return this.promotionService.applyPromoter(userId);
  }

  /** POST /api/promotion/apply-by-token - 通过二维码Token申请推广员 */
  @Post('apply-by-token')
  async applyByToken(
    @CurrentUser('id') userId: number,
    @Body('token') token: string,
  ) {
    // 绑定用户到申请记录
    await this.promotionService.bindApplicationByToken(token, userId);
    // 提交申请
    return this.promotionService.applyPromoter(userId);
  }

  /** POST /api/promotion/click - 记录分享点击（公开，无需登录） */
  @Public()
  @Post('click')
  async recordClick(@Body('promoterId') promoterId: number, @Body('openid') openid?: string) {
    return this.promotionService.recordClick(promoterId, openid);
  }
}
