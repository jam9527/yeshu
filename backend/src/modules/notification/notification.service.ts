import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  /** 创建通知 */
  async create(data: {
    userId: number;
    type: string;
    title: string;
    content?: string;
    relatedId?: number;
  }) {
    const notif = this.notifRepo.create(data);
    return this.notifRepo.save(notif);
  }

  /** 获取用户通知列表 */
  async findByUser(userId: number, page = 1, pageSize = 20) {
    const where = { userId };
    const [records, total] = await this.notifRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { records, total, page, pageSize };
  }

  /** 获取未读通知数量 */
  async countUnread(userId: number) {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  /** 标记为已读 */
  async markRead(id: number, userId: number) {
    await this.notifRepo.update({ id, userId }, { isRead: true });
  }

  /** 标记全部已读 */
  async markAllRead(userId: number) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
  }
}
