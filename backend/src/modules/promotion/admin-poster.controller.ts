import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/** 管理后台 - 推广海报管理 */
@AdminPermissions('promotion:manage')
@Controller('admin/promotion-poster')
export class AdminPosterController {
  constructor(private readonly promotionService: PromotionService) {}

  /** GET /api/admin/promotion-poster - 海报列表 */
  @Get()
  async getPosters() {
    return this.promotionService.getPosters();
  }

  /** POST /api/admin/promotion-poster - 创建海报 */
  @Post()
  async createPoster(@Body() dto: {
    name: string;
    backgroundUrl: string;
    textConfig: string;
    qrConfig: string;
  }) {
    return this.promotionService.createPoster(dto);
  }

  /** PUT /api/admin/promotion-poster/:id - 更新海报 */
  @Put(':id')
  async updatePoster(@Param('id') id: number, @Body() dto: any) {
    return this.promotionService.updatePoster(id, dto);
  }

  /** PUT /api/admin/promotion-poster/:id/activate - 激活海报 */
  @Put(':id/activate')
  async activatePoster(@Param('id') id: number) {
    return this.promotionService.activatePoster(id);
  }

  /** DELETE /api/admin/promotion-poster/:id - 删除海报 */
  @Delete(':id')
  async deletePoster(@Param('id') id: number) {
    return this.promotionService.deletePoster(id);
  }
}
