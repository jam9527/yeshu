import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

/**
 * 定时任务调度服务
 * 负责按 cron 表达式触发定时任务，通过 Bull 队列异步执行
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectQueue('tasks') private readonly tasksQueue: Queue,
  ) {}

  /**
   * 每日凌晨 1:00 滚动创建未来 30 天可预约日期
   */
  @Cron('0 1 * * *')
  async handleRollingDateCreation() {
    this.logger.log('入队: 滚动创建可预约日期');
    await this.tasksQueue.add('create-dates', {}, { removeOnComplete: true });
  }

  /**
   * 每日凌晨 2:00 处理过期预约
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredReservations() {
    this.logger.log('入队: 处理过期预约');
    await this.tasksQueue.add('expire-reservations', {}, { removeOnComplete: true });
  }

  /**
   * 每日凌晨 2:30 执行自动拉黑
   */
  @Cron('30 2 * * *')
  async handleAutoBlacklist() {
    this.logger.log('入队: 自动拉黑处理');
    await this.tasksQueue.add('auto-blacklist', {}, { removeOnComplete: true });
  }
}
