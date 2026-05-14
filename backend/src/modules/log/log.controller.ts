import { Controller, Get, Query } from '@nestjs/common';
import { LogService } from './log.service';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

@AdminPermissions('system:admin')
@Controller('admin/system/logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('login')
  getLoginLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.logService.getLoginLogs(page, pageSize);
  }

  @Get('operation')
  getOperationLogs(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.logService.getOperationLogs(page, pageSize);
  }
}
