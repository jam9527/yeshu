import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { Activity } from './entities/activity.entity';
import { Banner } from './entities/banner.entity';
import { Faq } from './entities/faq.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

/**
 * 内容管理模块 - 展厅、活动、Banner、FAQ 的 CRUD
 */
@Module({
  imports: [TypeOrmModule.forFeature([Exhibition, Activity, Banner, Faq])],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
