import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './entities/admin-role.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminSystemController } from './admin-system.controller';
import { LogModule } from '../log/log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser, AdminRole]),
    LogModule,
  ],
  controllers: [AuthController, AdminSystemController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
