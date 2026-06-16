import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrequencyLimit } from './entities/frequency-limit.entity';
import { NoticeConfig } from './entities/notice-config.entity';
import { ReservationTemplate } from './entities/reservation-template.entity';
import { SystemConfig } from './entities/system-config.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { ReservationConfigService } from './reservation-config.service';
import { ReservationConfigController } from './reservation-config.controller';
import { AdminConfigController } from './admin-config.controller';
import { PublicConfigController } from './public-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FrequencyLimit, NoticeConfig, ReservationTemplate, ReservationDateConfig, ReservationQuota, SystemConfig])],
  controllers: [ReservationConfigController, AdminConfigController, PublicConfigController],
  providers: [ReservationConfigService],
})
export class ReservationConfigModule {}
