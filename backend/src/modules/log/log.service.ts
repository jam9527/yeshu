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

  /** 记录登录日志 */
  async createLoginLog(data: {
    adminUserId?: number;
    username: string;
    ip?: string;
    loginResult: 'SUCCESS' | 'FAILED';
    failReason?: string;
  }) {
    const log = this.loginLogRepo.create(data);
    await this.loginLogRepo.save(log);
  }

  /** 记录操作日志 */
  async createOperationLog(data: {
    adminUserId?: number;
    action: string;
    module: string;
    resourceId?: number;
    detail?: any;
    ip?: string;
  }) {
    const log = this.opLogRepo.create(data);
    await this.opLogRepo.save(log);
  }
}
