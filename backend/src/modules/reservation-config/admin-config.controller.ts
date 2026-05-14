import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { SystemConfig } from './entities/system-config.entity';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * 管理后台 - 预约设置接口
 */
@AdminPermissions('config:manage')
@Controller('admin/config')
export class AdminConfigController {
  constructor(
    @InjectRepository(ReservationDateConfig)
    private readonly dateConfigRepo: Repository<ReservationDateConfig>,
    @InjectRepository(ReservationQuota)
    private readonly quotaRepo: Repository<ReservationQuota>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepo: Repository<SystemConfig>,
  ) {}

  /** GET /api/admin/config/dates - 获取所有日期配置 */
  @Get('dates')
  async getDates() {
    return this.dateConfigRepo.find({ order: { date: 'ASC' } });
  }

  /** POST /api/admin/config/dates - 新增日期配置 */
  @Post('dates')
  async createDate(@Body() dto: { date: string; amPersonalQuota?: number; amTeamQuota?: number; pmPersonalQuota?: number; pmTeamQuota?: number }) {
    const config = this.dateConfigRepo.create({
      date: dto.date,
      amPersonalQuota: dto.amPersonalQuota ?? 500,
      amTeamQuota: dto.amTeamQuota ?? 200,
      pmPersonalQuota: dto.pmPersonalQuota ?? 500,
      pmTeamQuota: dto.pmTeamQuota ?? 200,
    });
    const saved = await this.dateConfigRepo.save(config);

    // 自动创建配额记录
    const amQuota = this.quotaRepo.create({
      dateConfigId: saved.id,
      sessionType: 'AM',
      totalPersonal: saved.amPersonalQuota,
      totalTeam: saved.amTeamQuota,
    });
    const pmQuota = this.quotaRepo.create({
      dateConfigId: saved.id,
      sessionType: 'PM',
      totalPersonal: saved.pmPersonalQuota,
      totalTeam: saved.pmTeamQuota,
    });
    await this.quotaRepo.save([amQuota, pmQuota]);

    return saved;
  }

  /** PUT /api/admin/config/dates/:id - 更新日期配置 */
  @Put('dates/:id')
  async updateDate(@Param('id') id: number, @Body() dto: any) {
    await this.dateConfigRepo.update(id, dto);
    return { success: true };
  }

  /** DELETE /api/admin/config/dates/:id - 删除日期配置 */
  @Delete('dates/:id')
  async deleteDate(@Param('id') id: number) {
    await this.dateConfigRepo.delete(id);
    return { success: true };
  }

  /** GET /api/admin/config/quotas - 获取配额列表 */
  @Get('quotas')
  async getQuotas() {
    return this.quotaRepo.find({
      relations: ['dateConfig'],
      order: { dateConfig: { date: 'ASC' }, sessionType: 'ASC' },
    });
  }

  /** PUT /api/admin/config/quotas/:id - 更新配额 */
  @Put('quotas/:id')
  async updateQuota(@Param('id') id: number, @Body() dto: { totalPersonal?: number; totalTeam?: number }) {
    await this.quotaRepo.update(id, dto);
    return { success: true };
  }

  /** GET /api/admin/config/require-real-name - 获取实名预约开关状态 */
  @Get('require-real-name')
  async getRequireRealName() {
    const config = await this.systemConfigRepo.findOne({ where: { configKey: 'requireRealName' } });
    return { enabled: config?.configValue === 'true' };
  }

  /** PUT /api/admin/config/require-real-name - 设置实名预约开关 */
  @Put('require-real-name')
  async setRequireRealName(@Body('enabled') enabled: boolean) {
    let config = await this.systemConfigRepo.findOne({ where: { configKey: 'requireRealName' } });
    if (config) {
      config.configValue = enabled ? 'true' : 'false';
    } else {
      config = this.systemConfigRepo.create({
        configKey: 'requireRealName',
        configValue: enabled ? 'true' : 'false',
        description: '个人预约是否需要实名核验',
      });
    }
    await this.systemConfigRepo.save(config);
    return { success: true };
  }
}
