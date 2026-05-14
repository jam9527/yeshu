import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRecord } from './entities/verification-record.entity';
import { Reservation } from '../reservation/entities/reservation.entity';
import { ReservationVisitor } from '../reservation/entities/reservation-visitor.entity';
import { TeamReservationInfo } from '../reservation/entities/team-reservation-info.entity';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationRecord, Reservation, ReservationVisitor, TeamReservationInfo])],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
