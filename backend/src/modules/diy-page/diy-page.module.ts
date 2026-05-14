import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiyPage } from './entities/diy-page.entity';
import { DiyPageService } from './diy-page.service';
import { DiyPageController } from './diy-page.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DiyPage])],
  controllers: [DiyPageController],
  providers: [DiyPageService],
  exports: [DiyPageService],
})
export class DiyPageModule {}
