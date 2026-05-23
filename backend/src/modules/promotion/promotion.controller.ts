import { Controller, Get, Post, Param, Query, Body, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PromotionService } from './promotion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('promotion')
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly jwtService: JwtService,
  ) {}

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

  /** POST /api/promotion/click - 记录分享点击（公开，已登录用户自动提取身份） */
  @Public()
  @Post('click')
  async recordClick(
    @Body('promoterId') promoterId: number,
    @Body('openid') openid?: string,
    @Req() req?: any,
  ) {
    // 从 JWT 中提取用户 ID（已登录用户会自动带 token）
    let visitorUserId: number | undefined;
    const authHeader = req?.headers?.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token);
        visitorUserId = payload.sub || payload.id;
      } catch {
        // token 无效或过期，按匿名用户处理
      }
    }
    const record = await this.promotionService.recordClick(promoterId, openid, visitorUserId);
    // 已登录用户建立推广关系（避免依赖 /wechat/login 流程，该流程只对新用户触发）
    if (visitorUserId) {
      this.promotionService.associatePromoter(visitorUserId, promoterId).catch(() => {});
    }
    return record;
  }
}
