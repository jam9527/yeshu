import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginLog } from './entities/login-log.entity';
import { OperationLog } from './entities/operation-log.entity';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(LoginLog)
    private readonly loginLogRepo: Repository<LoginLog>,
    @InjectRepository(OperationLog)
    private readonly opLogRepo: Repository<OperationLog>,
  ) {}

  /** 获取登录日志 */
  async getLoginLogs(page = 1, pageSize = 10) {
    const [records, total] = await this.loginLogRepo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { loginAt: 'DESC' },
    });
    return { records, total, page, pageSize };
  }

  /** 获取操作日志 */
  async getOperationLogs(page = 1, pageSize = 10) {
    const [records, total] = await this.opLogRepo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { records, total, page, pageSize };
  }
}
