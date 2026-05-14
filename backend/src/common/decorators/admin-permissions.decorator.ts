import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './public.decorator';

/**
 * 管理员权限装饰器
 * 为路由设置所需角色/权限，由全局 RolesGuard 自动检查
 *
 * 使用方式:
 *   @AdminPermissions()                         // 仅需登录（管理员身份）
 *   @AdminPermissions('reservation:review')     // 需要预约审核权限
 *   @AdminPermissions('super_admin')            // 仅超级管理员
 */
export const AdminPermissions = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
