import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Reservation } from '../reservation/entities/reservation.entity';
import { User } from '../user/entities/user.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Reservation, User, ReservationDateConfig, ReservationQuota]),
  ],
  providers: [TasksService],
})
export class TasksModule {}
