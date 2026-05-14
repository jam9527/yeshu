import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ReservationVisitor } from '../reservation/entities/reservation-visitor.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, ReservationVisitor, ReservationQuota, ReservationDateConfig])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
