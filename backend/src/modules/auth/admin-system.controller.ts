import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { AdminRole } from './entities/admin-role.entity';
import { AdminPermissions } from '../../common/decorators/admin-permissions.decorator';

/**
 * 管理后台 - 系统管理接口（账号管理、角色管理）
 */
@AdminPermissions('system:admin')
@Controller('admin/system')
export class AdminSystemController {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepo: Repository<AdminUser>,
    @InjectRepository(AdminRole)
    private readonly adminRoleRepo: Repository<AdminRole>,
  ) {}

  // ========== 账号管理 ==========

  @Get('users')
  async getUsers() {
    const users = await this.adminUserRepo.find({ order: { createdAt: 'DESC' } });
    const roleIds = users.filter(u => u.roleId).map(u => Number(u.roleId));
    const roles = roleIds.length > 0
      ? await this.adminRoleRepo.find({ where: roleIds.map(id => ({ id })) })
      : [];
    const roleMap = new Map(roles.map(r => [Number(r.id), r]));
    return users.map(u => {
      const { passwordHash, ...rest } = u as any;
      const role = roleMap.get(Number(u.roleId));
      return {
        ...rest,
        roleName: role?.name || null,
      };
    });
  }

  @Post('users')
  async createUser(@Body() dto: { username: string; password: string; nickname?: string; roleId?: number }) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.adminUserRepo.create({ ...dto, passwordHash });
    const saved = await this.adminUserRepo.save(user);
    const { passwordHash: _, ...result } = saved as any;
    return result;
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: number, @Body() dto: { username?: string; password?: string; nickname?: string; roleId?: number }) {
    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    delete updateData.password;
    await this.adminUserRepo.update(id, updateData);
    return { success: true };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: number) {
    await this.adminUserRepo.delete(id);
    return { success: true };
  }

  // ========== 角色管理 ==========

  @Get('roles')
  async getRoles() {
    return this.adminRoleRepo.find({ order: { createdAt: 'DESC' } });
  }

  @Post('roles')
  async createRole(@Body() dto: { name: string; code: string; description?: string; permissions?: any }) {
    const role = this.adminRoleRepo.create({ ...dto, permissions: dto.permissions || [] });
    return this.adminRoleRepo.save(role);
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: number, @Body() dto: { name?: string; code?: string; description?: string; permissions?: any }) {
    await this.adminRoleRepo.update(id, dto);
    return { success: true };
  }

  @Delete('roles/:id')
  async deleteRole(@Param('id') id: number) {
    await this.adminRoleRepo.delete(id);
    return { success: true };
  }
}
