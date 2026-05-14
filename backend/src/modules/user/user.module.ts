import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AdminUserController } from './admin-user.controller';

/**
 * 用户模块 - 用户信息管理与权限控制
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, AdminUserController],
  providers: [UserService],
  exports: [UserService, TypeOrmModule.forFeature([User])],
})
export class UserModule {}
