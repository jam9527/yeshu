import { Controller, Post, Get, Param, Query, Body, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifierGuard } from '../../common/guards/verifier.guard';

/**
 * 核销管理接口
 */
@UseGuards(VerifierGuard)
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /** POST /api/verification/scan - 扫码验证 */
  @Post('scan')
  async scan(@Body('qrCode') qrCode: string, @CurrentUser('id') verifierId: number) {
    return this.verificationService.scan(qrCode, verifierId);
  }

  /** POST /api/verification/confirm - 确认核销 */
  @Post('confirm')
  async confirm(
    @Body('reservationId') reservationId: number,
    @Body('actualCount') actualCount: number,
    @CurrentUser('id') verifierId: number,
  ) {
    return this.verificationService.confirm(reservationId, verifierId, actualCount);
  }

  /** GET /api/verification/records - 核销记录 */
  @Get('records')
  async getRecords(
    @CurrentUser('id') verifierId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.verificationService.findByVerifier(verifierId, page, pageSize);
  }

  /** GET /api/verification/stats - 核销统计 */
  @Get('stats')
  async getStats(@CurrentUser('id') verifierId: number) {
    return this.verificationService.getStats(verifierId);
  }
}
