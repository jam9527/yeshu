import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * 内容展示与管理接口
 *
 * 公开接口（小程序端）: 无需认证
 * 管理接口（管理后台）: 需 content:manage 权限
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

  // ========== 管理后台接口（需 content:manage 权限） ==========

  // -- 展厅 --
  @AdminPermissions('content:manage')
  @Post('admin/exhibitions')
  createExhibition(@Body() data: any) {
    return this.contentService.createExhibition(data);
  }

  @AdminPermissions('content:manage')
  @Put('admin/exhibitions/:id')
  updateExhibition(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateExhibition(id, data);
  }

  @AdminPermissions('content:manage')
  @Delete('admin/exhibitions/:id')
  deleteExhibition(@Param('id') id: number) {
    return this.contentService.deleteExhibition(id);
  }

  // -- 活动 --
  @AdminPermissions('content:manage')
  @Post('admin/activities')
  createActivity(@Body() data: any) {
    return this.contentService.createActivity(data);
  }

  @AdminPermissions('content:manage')
  @Put('admin/activities/:id')
  updateActivity(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateActivity(id, data);
  }

  @AdminPermissions('content:manage')
  @Delete('admin/activities/:id')
  deleteActivity(@Param('id') id: number) {
    return this.contentService.deleteActivity(id);
  }

  // -- Banner --
  @AdminPermissions('content:manage')
  @Post('admin/banners')
  createBanner(@Body() data: any) {
    return this.contentService.createBanner(data);
  }

  @AdminPermissions('content:manage')
  @Put('admin/banners/:id')
  updateBanner(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateBanner(id, data);
  }

  @AdminPermissions('content:manage')
  @Delete('admin/banners/:id')
  deleteBanner(@Param('id') id: number) {
    return this.contentService.deleteBanner(id);
  }

  // -- FAQ --
  @AdminPermissions('content:manage')
  @Post('admin/faqs')
  createFaq(@Body() data: any) {
    return this.contentService.createFaq(data);
  }

  @AdminPermissions('content:manage')
  @Put('admin/faqs/:id')
  updateFaq(@Param('id') id: number, @Body() data: any) {
    return this.contentService.updateFaq(id, data);
  }

  @AdminPermissions('content:manage')
  @Delete('admin/faqs/:id')
  deleteFaq(@Param('id') id: number) {
    return this.contentService.deleteFaq(id);
  }
}
