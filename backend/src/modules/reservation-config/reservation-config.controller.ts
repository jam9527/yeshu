import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ReservationConfigService } from './reservation-config.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class ReservationConfigController {
  constructor(private readonly configService: ReservationConfigService) {}

  // -- 预约须知（公开） --
  @Public()
  @Get('notices/:type')
  getNotice(@Param('type') type: string) {
    return this.configService.getNotice(type);
  }

  // -- 模板（公开） --
  @Public()
  @Get('config/templates/active')
  getActiveTemplate() {
    return this.configService.getActiveTemplate();
  }

  // -- 频率限制（管理后台） --
  @Get('admin/config/frequency-limits')
  getFrequencyLimits() {
    return this.configService.getFrequencyLimits();
  }

  @Post('admin/config/frequency-limits')
  createFrequencyLimit(@Body() data: any) {
    return this.configService.createFrequencyLimit(data);
  }

  @Put('admin/config/frequency-limits/:id')
  updateFrequencyLimit(@Param('id') id: number, @Body() data: any) {
    return this.configService.updateFrequencyLimit(id, data);
  }

  // -- 预约须知（管理后台） --
  @Put('admin/config/notices/:type')
  updateNotice(@Param('type') type: string, @Body('content') content: string) {
    return this.configService.updateNotice(type, content);
  }

  // -- 模板（管理后台） --
  @Get('admin/config/templates')
  getAllTemplates() {
    return this.configService.getAllTemplates();
  }

  @Post('admin/config/templates')
  uploadTemplate(@Body() data: any) {
    return this.configService.uploadTemplate(data);
  }

  @Put('admin/config/templates/:id')
  updateTemplate(@Param('id') id: number, @Body() data: any) {
    return this.configService.updateTemplate(id, data);
  }

  @Delete('admin/config/templates/:id')
  deleteTemplate(@Param('id') id: number) {
    return this.configService.deleteTemplate(id);
  }
}
