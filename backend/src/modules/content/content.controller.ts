import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 内容展示与管理接口
 *
 * 公开接口（小程序端）: 无需认证
 * 管理接口（管理后台）: 需管理员权限（TODO: 添加 Roles guard）
 */
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ========== 公开接口 ==========

  @Public()
  @Get('banners')
  getBanners() {
    return this.contentService.getBanners();
  }

  @Public()
  @Get('exhibitions')
  getExhibitions() {
    return this.contentService.getExhibitions();
  }

  @Public()
  @Get('exhibitions/:id')
  getExhibition(@Param('id') id: number) {
    return this.contentService.getExhibition(id);
  }

  @Public()
  @Get('activities')
  getActivities() {
    return this.contentService.getActivities();
  }

  @Public()
  @Get('activities/:id')
  getActivity(@Param('id') id: number) {
    return this.contentService.getActivity(id);
  }

  @Public()
  @Get('faqs')
  getFaqs() {
    return this.contentService.getFaqs();
  }

  // ========== 管理后台接口（需登录） ==========

  // -- 展厅 --
  @Post('admin/exhibitions')
  createExhibition(@Body() data: any) {
    return this.contentService.createExhibition(data);
  }

  @Put('admin/exhibitions/:id')
  updateExhibition(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateExhibition(id, data);
  }

  @Delete('admin/exhibitions/:id')
  deleteExhibition(@Param('id') id: number) {
    return this.contentService.deleteExhibition(id);
  }

  // -- 活动 --
  @Post('admin/activities')
  createActivity(@Body() data: any) {
    return this.contentService.createActivity(data);
  }

  @Put('admin/activities/:id')
  updateActivity(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateActivity(id, data);
  }

  @Delete('admin/activities/:id')
  deleteActivity(@Param('id') id: number) {
    return this.contentService.deleteActivity(id);
  }

  // -- Banner --
  @Post('admin/banners')
  createBanner(@Body() data: any) {
    return this.contentService.createBanner(data);
  }

  @Put('admin/banners/:id')
  updateBanner(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateBanner(id, data);
  }

  @Delete('admin/banners/:id')
  deleteBanner(@Param('id') id: number) {
    return this.contentService.deleteBanner(id);
  }

  // -- FAQ --
  @Post('admin/faqs')
  createFaq(@Body() data: any) {
    return this.contentService.createFaq(data);
  }

  @Put('admin/faqs/:id')
  updateFaq(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateFaq(id, data);
  }

  @Delete('admin/faqs/:id')
  deleteFaq(@Param('id') id: number) {
    return this.contentService.deleteFaq(id);
  }
}
