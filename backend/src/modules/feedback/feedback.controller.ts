import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('feedback')
  create(
    @CurrentUser('id') userId: number,
    @Body('content') content: string,
    @Body('contact') contact?: string,
    @Body('images') images?: string[],
  ) {
    return this.feedbackService.create(userId, content, contact, images);
  }

  @AdminPermissions('feedback:view')
  @Get('admin/feedbacks')
  findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.feedbackService.findAll(Number(page), Number(pageSize));
  }
}
