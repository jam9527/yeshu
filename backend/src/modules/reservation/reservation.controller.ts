import { Controller, Get, Post, Put, Param, Query, Body, Res } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { Response } from 'express';

/**
 * 预约管理接口
 */
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  /** GET /api/reservations/available-dates - 获取可预约日期 */
  @Public()
  @Get('available-dates')
  async getAvailableDates() {
    return this.reservationService.getAvailableDates();
  }

  /** GET /api/reservations/date/:date/quota - 获取指定日期配额 */
  @Public()
  @Get('date/:date/quota')
  async getDateQuota(@Param('date') date: string) {
    return this.reservationService.getDateQuota(date);
  }

  /** POST /api/reservations/personal - 创建个人预约 */
  @Post('personal')
  async createPersonal(
    @CurrentUser('id') userId: number,
    @Body() dto: {
      dateConfigId: number;
      sessionType: string;
      visitors: { name: string; idCard: string; province: string; city: string; visitorType: string }[];
    },
  ) {
    return this.reservationService.createPersonal(userId, dto);
  }

  /** POST /api/reservations/team - 创建团队预约 */
  @Post('team')
  async createTeam(
    @CurrentUser('id') userId: number,
    @Body() dto: {
      dateConfigId: number;
      sessionType: string;
      visitorCount: number;
      contactName: string;
      contactPhone: string;
      idCardType?: string;
      contactIdCard?: string;
      teamType: string;
      orgName: string;
      orgCode?: string;
      applicationFile?: string;
      attachmentFiles?: string;
    },
  ) {
    return this.reservationService.createTeam(userId, dto);
  }

  /** GET /api/reservations/my - 我的预约列表 */
  @Get('my')
  async getMyReservations(
    @CurrentUser('id') userId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationService.findByUser(userId, page, pageSize, type, status);
  }

  /** GET /api/reservations/:id - 预约详情 */
  @Get(':id')
  async getDetail(@Param('id') id: number) {
    return this.reservationService.findById(id);
  }

  /** GET /api/reservations/:id/qrcode - 获取核销二维码图片（PNG） */
  @Public()
  @Get(':id/qrcode')
  async getQrCodeImage(@Param('id') id: number, @Res() res: Response) {
    const buffer = await this.reservationService.generateQrCodeImage(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  /** POST /api/reservations/seed-test-dates - 创建测试用可预约日期 */
  @Public()
  @Post('seed-test-dates')
  async seedTestDates() {
    return this.reservationService.seedTestDates();
  }

  /** POST /api/reservations/seed-frequency-limits - 创建测试用频率限制 */
  @Public()
  @Post('seed-frequency-limits')
  async seedFrequencyLimits() {
    return this.reservationService.seedFrequencyLimits();
  }

  /** PUT /api/reservations/:id/cancel - 取消预约 */
  @Put(':id/cancel')
  async cancel(
    @Param('id') id: number,
    @CurrentUser('id') userId: number,
    @Body('reason') reason?: string,
  ) {
    return this.reservationService.cancel(id, userId, reason);
  }
}
