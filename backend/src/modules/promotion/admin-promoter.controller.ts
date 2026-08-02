import { Controller, Get, Post, Put, Param, Query, Body, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PromotionService } from './promotion.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 管理后台 - 推广员管理接口
 */
@AdminPermissions('promotion:manage')
@Controller('admin/promoters')
export class AdminPromoterController {
  constructor(private readonly promotionService: PromotionService) {}

  /** GET /api/admin/promoters - 推广员列表 */
  @Get()
  async getPromoters(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.promotionService.getPromoters(page, pageSize);
  }

  /** DELETE /api/admin/promoters/:userId - 取消推广员资格 */
  @Put(':userId/disable')
  async disablePromoter(@Param('userId', ParseIntPipe) userId: number) {
    await this.promotionService.removePromoter(userId);
    return { success: true };
  }

  /** GET /api/admin/promoters/applications - 申请列表 */
  @Get('applications')
  async getApplications(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.promotionService.getApplications(status, page, pageSize);
  }

  /** POST /api/admin/promoters/generate-qr - 生成推广邀请二维码 */
  @Post('generate-qr')
  async generateQr() {
    return this.promotionService.generatePromoterQrCode();
  }

  /** GET /api/admin/promoters/stats - 推广员详细业绩统计 */
  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('promoterId') promoterId?: string,
    @Query('searchType') searchType?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.promotionService.getDetailedStats(
      startDate, endDate,
      promoterId ? parseInt(promoterId, 10) : undefined,
      searchType, keyword,
    );
  }

  /** GET /api/admin/promoters/stats/export - 导出推广员业绩 CSV */
  @Get('stats/export')
  async exportStats(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.promotionService.exportStatsCsv(startDate, endDate);
    const filename = `推广员业绩_${startDate || '全部'}_${endDate || '全部'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(csv, 'utf-8'));
  }

  /** POST /api/admin/promoters/applications - 后台直接添加推广员 */
  @Post('applications')
  async createApplication(@Body('userId') userId: number) {
    const app = await this.promotionService.applyPromoter(userId);
    await this.promotionService.approveApplication(app.id, 0);
    return { success: true };
  }

  /** PUT /api/admin/promoters/applications/:id/approve - 审核通过 */
  @Put('applications/:id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    await this.promotionService.approveApplication(id, adminId);
    return { success: true };
  }

  /** PUT /api/admin/promoters/applications/:id/reject - 驳回 */
  @Put('applications/:id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
    @Body('remark') remark?: string,
  ) {
    await this.promotionService.rejectApplication(id, adminId, remark);
    return { success: true };
  }
}
