import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Redis 缓存模块
 * 全局模块，提供 RedisService 用于数据缓存
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
