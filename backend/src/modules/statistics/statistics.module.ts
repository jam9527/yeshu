import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { RealNameInfo } from '../real-name/entities/real-name.entity';
import { VerificationRecord } from '../verification/entities/verification-record.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, ReservationQuota, ReservationDateConfig, RealNameInfo, VerificationRecord])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
