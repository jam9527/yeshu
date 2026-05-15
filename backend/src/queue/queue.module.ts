import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksProcessor } from './tasks.processor';
import { Reservation } from '../modules/reservation/entities/reservation.entity';
import { User } from '../modules/user/entities/user.entity';
import { ReservationDateConfig } from '../modules/reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../modules/reservation/entities/reservation-quota.entity';

/**
 * Bull 队列模块
 * 提供异步任务队列，用于处理预约过期、自动拉黑等后台任务
 */
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,               // 失败自动重试 3 次
        removeOnComplete: true,    // 完成后自动移除
        removeOnFail: false,       // 保留失败任务便于排查
      },
    }),
    BullModule.registerQueue({ name: 'tasks' }),
    TypeOrmModule.forFeature([Reservation, User, ReservationDateConfig, ReservationQuota]),
  ],
  providers: [TasksProcessor],
  exports: [BullModule],
})
export class QueueModule {}
