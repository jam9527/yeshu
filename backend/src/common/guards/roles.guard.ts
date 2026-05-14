import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/public.decorator';
import { AdminRole } from '../../modules/auth/entities/admin-role.entity';

/**
 * 角色权限守卫
 * 与 @Roles() 装饰器配合使用，检查当前用户是否拥有所需权限
 *
 * 使用方式:
 * @Roles('reservation:review')     // 需要预约审核权限
 * @Roles('system:admin')           // 需要系统管理权限
 * @Roles('super_admin')            // 仅超级管理员
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AdminRole)
    private readonly roleRepo: Repository<AdminRole>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 没有设置角色要求，放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // 仅限管理后台用户
    if (user.type !== 'admin') {
      throw new ForbiddenException('仅管理后台用户可访问');
    }

    // 超级管理员拥有所有权限
    if (user.isSuperAdmin) {
      return true;
    }

    // 仅超级管理员可访问的权限
    if (requiredRoles.includes('super_admin')) {
      throw new ForbiddenException('仅超级管理员可执行此操作');
    }

    // 检查用户角色权限
    if (user.roleId) {
      const role = await this.roleRepo.findOne({ where: { id: user.roleId, status: 1 } });
      if (role) {
        const permissions = Array.isArray(role.permissions) ? role.permissions : [];
        const hasPermission = requiredRoles.some((r) => permissions.includes(r));
        if (hasPermission) return true;
      }
    }

    throw new ForbiddenException('权限不足，请联系管理员');
  }
}
