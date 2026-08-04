import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationDateConfig } from '../reservation/entities/reservation-date-config.entity';
import { ReservationQuota } from '../reservation/entities/reservation-quota.entity';
import { SystemConfig } from './entities/system-config.entity';
import { ReservationConfigService } from './reservation-config.service';
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
    private readonly configService: ReservationConfigService,
  ) {}

  /** GET /api/admin/config/dates - 获取所有日期配置 */
  @Get('dates')
  async getDates() {
    return this.dateConfigRepo.find({ order: { date: 'ASC' } });
  }

  /** POST /api/admin/config/dates - 新增日期配置 */
  @Post('dates')
  async createDate(@Body() dto: { date: string; morningStart?: string; morningEnd?: string; afternoonStart?: string; afternoonEnd?: string; eveningStart?: string; eveningEnd?: string; morningEnabled?: boolean; afternoonEnabled?: boolean; eveningEnabled?: boolean; amPersonalQuota?: number; amTeamQuota?: number; pmPersonalQuota?: number; pmTeamQuota?: number; evPersonalQuota?: number; evTeamQuota?: number }) {
    const config = this.dateConfigRepo.create({
      date: dto.date,
      morningStart: dto.morningStart ?? '09:00',
      morningEnd: dto.morningEnd ?? '12:00',
      afternoonStart: dto.afternoonStart ?? '14:00',
      afternoonEnd: dto.afternoonEnd ?? '17:00',
      eveningStart: dto.eveningStart ?? '19:00',
      eveningEnd: dto.eveningEnd ?? '21:00',
      morningEnabled: dto.morningEnabled ?? true,
      afternoonEnabled: dto.afternoonEnabled ?? true,
      eveningEnabled: dto.eveningEnabled ?? true,
      amPersonalQuota: dto.amPersonalQuota ?? 500,
      amTeamQuota: dto.amTeamQuota ?? 200,
      pmPersonalQuota: dto.pmPersonalQuota ?? 500,
      pmTeamQuota: dto.pmTeamQuota ?? 200,
      evPersonalQuota: dto.evPersonalQuota ?? 500,
      evTeamQuota: dto.evTeamQuota ?? 200,
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
    const evQuota = this.quotaRepo.create({
      dateConfigId: saved.id,
      sessionType: 'EV',
      totalPersonal: saved.evPersonalQuota,
      totalTeam: saved.evTeamQuota,
    });
    await this.quotaRepo.save([amQuota, pmQuota, evQuota]);

    return saved;
  }

  /** PUT /api/admin/config/dates/:id - 更新日期配置（同步配额表） */
  @Put('dates/:id')
  async updateDate(@Param('id') id: number, @Body() dto: any) {
    await this.dateConfigRepo.update(id, dto);

    // 同步更新配额表，确保前台查询的剩余名额一致
    if (dto.amPersonalQuota !== undefined || dto.amTeamQuota !== undefined) {
      const amQuota = await this.quotaRepo.findOne({ where: { dateConfigId: id, sessionType: 'AM' } });
      if (amQuota) {
        if (dto.amPersonalQuota !== undefined) amQuota.totalPersonal = dto.amPersonalQuota;
        if (dto.amTeamQuota !== undefined) amQuota.totalTeam = dto.amTeamQuota;
        await this.quotaRepo.save(amQuota);
      }
    }
    if (dto.pmPersonalQuota !== undefined || dto.pmTeamQuota !== undefined) {
      const pmQuota = await this.quotaRepo.findOne({ where: { dateConfigId: id, sessionType: 'PM' } });
      if (pmQuota) {
        if (dto.pmPersonalQuota !== undefined) pmQuota.totalPersonal = dto.pmPersonalQuota;
        if (dto.pmTeamQuota !== undefined) pmQuota.totalTeam = dto.pmTeamQuota;
        await this.quotaRepo.save(pmQuota);
      }
    }
    if (dto.evPersonalQuota !== undefined || dto.evTeamQuota !== undefined) {
      const evQuota = await this.quotaRepo.findOne({ where: { dateConfigId: id, sessionType: 'EV' } });
      if (evQuota) {
        if (dto.evPersonalQuota !== undefined) evQuota.totalPersonal = dto.evPersonalQuota;
        if (dto.evTeamQuota !== undefined) evQuota.totalTeam = dto.evTeamQuota;
        await this.quotaRepo.save(evQuota);
      }
    }

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

  /** PUT /api/admin/config/quotas/:id - 更新配额（同步日期配置表） */
  @Put('quotas/:id')
  async updateQuota(@Param('id') id: number, @Body() dto: { totalPersonal?: number; totalTeam?: number }) {
    const quota = await this.quotaRepo.findOne({ where: { id } });
    if (!quota) return { success: false, message: '配额记录不存在' };

    await this.quotaRepo.update(id, dto);

    // 同步更新日期配置表
    const dateDto: any = {};
    if (dto.totalPersonal !== undefined) {
      if (quota.sessionType === 'AM') dateDto.amPersonalQuota = dto.totalPersonal;
      else if (quota.sessionType === 'PM') dateDto.pmPersonalQuota = dto.totalPersonal;
      else if (quota.sessionType === 'EV') dateDto.evPersonalQuota = dto.totalPersonal;
    }
    if (dto.totalTeam !== undefined) {
      if (quota.sessionType === 'AM') dateDto.amTeamQuota = dto.totalTeam;
      else if (quota.sessionType === 'PM') dateDto.pmTeamQuota = dto.totalTeam;
      else if (quota.sessionType === 'EV') dateDto.evTeamQuota = dto.totalTeam;
    }
    if (Object.keys(dateDto).length > 0) {
      await this.dateConfigRepo.update(quota.dateConfigId, dateDto);
    }

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

  /** GET /api/admin/config/login-page — 获取登录页自定义配置 */
  @Get('login-page')
  async getLoginPageConfig() {
    const config = await this.systemConfigRepo.findOne({ where: { configKey: 'loginPage' } });
    if (!config) return {};
    try {
      return JSON.parse(config.configValue);
    } catch {
      return {};
    }
  }

  /** PUT /api/admin/config/login-page — 保存登录页自定义配置 */
  @Put('login-page')
  async setLoginPageConfig(@Body() dto: {
    background?: string;
    logo?: string;
    titleColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  }) {
    await this.configService.setConfig(
      'loginPage',
      JSON.stringify(dto),
      '小程序登录页自定义配置',
    );
    return { success: true };
  }
}
