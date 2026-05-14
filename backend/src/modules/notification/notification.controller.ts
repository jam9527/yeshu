import { Controller, Get, Put, Param, Query, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  /** GET /api/notifications — 当前用户通知列表 */
  @Get()
  async list(
    @CurrentUser('id') userId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.notifService.findByUser(userId, page, pageSize);
  }

  /** GET /api/notifications/unread-count — 未读通知数量 */
  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: number) {
    const count = await this.notifService.countUnread(userId);
    return { count };
  }

  /** PUT /api/notifications/:id/read — 标记单条已读 */
  @Put(':id/read')
  async markRead(@Param('id') id: number, @CurrentUser('id') userId: number) {
    await this.notifService.markRead(id, userId);
    return { success: true };
  }

  /** PUT /api/notifications/read-all — 标记全部已读 */
  @Put('read-all')
  async markAllRead(@CurrentUser('id') userId: number) {
    await this.notifService.markAllRead(userId);
    return { success: true };
  }
}
