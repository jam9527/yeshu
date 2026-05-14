/**
 * 自定义装饰器: 获取当前登录用户信息
 * 用于 Controller 参数注入，替代手动从 request 中提取
 *
 * 用法: @CurrentUser() user: User
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
