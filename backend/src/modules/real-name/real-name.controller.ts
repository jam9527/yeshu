import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RealNameService } from './real-name.service';
import { IdCardVerificationService } from './id-card-verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 实名信息管理接口
 */
@Controller('real-names')
export class RealNameController {
  constructor(
    private readonly realNameService: RealNameService,
    private readonly verificationService: IdCardVerificationService,
  ) {}

  /** GET /api/real-names - 获取实名信息列表 */
  @Get()
  async findAll(@CurrentUser('id') userId: number) {
    return this.realNameService.findByUserId(userId);
  }

  /**
   * POST /api/real-names/verify - 姓名+身份证号二要素核验
   * 不依赖图片，直接提交姓名和证件号进行实名核验
   */
  @Post('verify')
  async verify(
    @Body() data: { name: string; idCard: string },
  ) {
    const result = await this.verificationService.verify(data.name, data.idCard);
    return result;
  }

  /** GET /api/real-names/:id - 获取单条实名信息 */
  @Get(':id')
  async findOne(@Param('id') id: number, @CurrentUser('id') userId: number) {
    return this.realNameService.findOne(id, userId);
  }

  /** POST /api/real-names - 新增实名信息 */
  @Post()
  async create(
    @CurrentUser('id') userId: number,
    @Body() data: { name: string; idCard: string; idCardType?: string; province?: string; city?: string },
  ) {
    return this.realNameService.create(userId, data);
  }

  /** PUT /api/real-names/:id - 编辑实名信息 */
  @Put(':id')
  async update(
    @Param('id') id: number,
    @CurrentUser('id') userId: number,
    @Body() data: Partial<{ name: string; idCard: string; idCardType: string; province: string; city: string }>,
  ) {
    return this.realNameService.update(id, userId, data);
  }

  /** DELETE /api/real-names/:id - 删除实名信息 */
  @Delete(':id')
  async remove(@Param('id') id: number, @CurrentUser('id') userId: number) {
    await this.realNameService.softDelete(id, userId);
    return { success: true };
  }
}
