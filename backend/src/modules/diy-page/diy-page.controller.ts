import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { DiyPageService } from './diy-page.service';
import { Public } from '../../common/decorators/public.decorator';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * DIY 页面管理接口
 * - 小程序端: GET /api/diy-page/active -> 获取启用的页面配置
 * - 管理后台: CRUD + 发布
 */
@Controller('diy-page')
export class DiyPageController {
  constructor(private readonly diyPageService: DiyPageService) {}

  /** 获取启用的页面配置（小程序渲染用，无需登录） */
  @Public()
  @Get('active')
  async getActive(@Query('pageKey') pageKey?: string) {
    return this.diyPageService.getActive(pageKey || 'home');
  }

  /** 获取所有版本列表（管理后台） */
  @AdminPermissions('diy:manage')
  @Get()
  async findAll(@Query('pageKey') pageKey?: string) {
    return this.diyPageService.findAll(pageKey || 'home');
  }

  /** 获取单条配置 */
  @AdminPermissions('diy:manage')
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.diyPageService.findOne(id);
  }

  /** 创建新版本 */
  @AdminPermissions('diy:manage')
  @Post()
  async create(@Body() data: { pageKey: string; name: string; config: object }) {
    return this.diyPageService.create(data);
  }

  /** 更新配置 */
  @AdminPermissions('diy:manage')
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() data: { name?: string; config?: object },
  ) {
    return this.diyPageService.update(id, data);
  }

  /** 发布版本 */
  @AdminPermissions('diy:manage')
  @Put(':id/publish')
  async publish(@Param('id') id: number) {
    return this.diyPageService.publish(id);
  }

  /** 删除 */
  @AdminPermissions('diy:manage')
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.diyPageService.remove(id);
  }
}
