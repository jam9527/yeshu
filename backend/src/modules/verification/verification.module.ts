import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRecord } from './entities/verification-record.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { TeamReservationInfo } from '../reservation/entities/team-reservation-info.entity';
import { User } from '../user/entities/user.entity';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { VerifierGuard } from '../../common/guards/verifier.guard';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PromotionModule } from '../promotion/promotion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationRecord, Reservation, TeamReservationInfo, User, ReservationDateConfig]),
    forwardRef(() => PromotionModule),
  ],
  controllers: [VerificationController],
  providers: [VerificationService, VerifierGuard],
})
export class VerificationModule {}
