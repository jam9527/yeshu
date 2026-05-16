import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { typeOrmConfig } from './database/typeorm.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { OperationLogInterceptor } from './common/interceptors/operation-log.interceptor';
import { AdminRole } from './modules/auth/entities/admin-role.entity';
import { AdminUser } from './modules/auth/entities/admin-user.entity';

// 基础设施模块
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';

// 业务模块
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { WechatModule } from './modules/wechat/wechat.module';
import { RealNameModule } from './modules/real-name/real-name.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ContentModule } from './modules/content/content.module';
import { ReservationConfigModule } from './modules/reservation-config/reservation-config.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FileModule } from './modules/file/file.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { LogModule } from './modules/log/log.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RegionsModule } from './modules/regions/regions.module';
import { DiyPageModule } from './modules/diy-page/diy-page.module';
import { NotificationModule } from './modules/notification/notification.module';

/**
 * 应用根模块
 * 集中导入所有业务模块和全局配置
 */
@Module({
  imports: [
    // 环境变量配置（.env 文件）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库连接
    TypeOrmModule.forRoot(typeOrmConfig),

    // 接口限流（防止恶意请求）
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 60 秒窗口
        limit: 100,   // 最多 100 次请求
      },
    ]),

    // JWT 全局模块（用于全局 JwtAuthGuard 守卫）
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your_jwt_secret',
      signOptions: { expiresIn: '7d' },
    }),

    // RolesGuard 需要访问 AdminRole / AdminUser 仓库
    TypeOrmModule.forFeature([AdminRole, AdminUser]),

    // 基础设施
    RedisModule,
    QueueModule,

    // 业务模块
    UserModule,
    AuthModule,
    WechatModule,
    RealNameModule,
    ReservationModule,
    VerificationModule,
    ContentModule,
    ReservationConfigModule,
    PromotionModule,
    FeedbackModule,
    FileModule,
    RegionsModule,
    DiyPageModule,
    NotificationModule,
    StatisticsModule,
    LogModule,
    TasksModule,
  ],
  providers: [
    // JwtAuthGuard 先执行，验证 token 并注入 request.user
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // RolesGuard 后执行，从 request.user 获取用户进行权限校验
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // 全局操作日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
})
export class AppModule {}
