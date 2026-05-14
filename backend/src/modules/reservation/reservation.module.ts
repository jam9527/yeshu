import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { ReservationVisitor } from './entities/reservation-visitor.entity';
import { ReservationQuota } from './entities/reservation-quota.entity';
import { ReservationDateConfig } from './entities/reservation-date-config.entity';
import { TeamReservationInfo } from './entities/team-reservation-info.entity';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { AdminReservationController } from './admin-reservation.controller';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { FrequencyLimit } from '../reservation-config/entities/frequency-limit.entity';
import { SystemConfig } from '../reservation-config/entities/system-config.entity';
import { RealNameInfo } from '../real-name/entities/real-name.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      ReservationVisitor,
      ReservationQuota,
      ReservationDateConfig,
      TeamReservationInfo,
      FrequencyLimit,
      SystemConfig,
      RealNameInfo,
    ]),
    UserModule,
    NotificationModule,
  ],
  controllers: [ReservationController, AdminReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
