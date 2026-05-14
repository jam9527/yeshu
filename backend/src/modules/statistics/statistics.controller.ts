import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

@AdminPermissions()
@Controller('admin/statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  async overview() {
    return this.statisticsService.overview();
  }

  @Get('weekly-trend')
  async weeklyTrend() {
    return this.statisticsService.weeklyTrend();
  }

  @Get('age-distribution')
  async ageDistribution() {
    return this.statisticsService.ageDistribution();
  }

  @Get('popular-dates')
  async popularDates(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.statisticsService.popularDates(year, month);
  }

  @Get('daily-quota')
  async dailyQuota(@Query('date') date?: string) {
    return this.statisticsService.dailyQuota(date);
  }

  @Get('reservation-stats')
  async reservationStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statisticsService.reservationStats(startDate, endDate);
  }
}
