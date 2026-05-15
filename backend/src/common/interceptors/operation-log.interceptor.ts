import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogService } from '../../modules/log/log.service';

/**
 * 操作日志拦截器
 * 自动记录管理后台的 POST/PUT/DELETE 操作
 */
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, params, body, headers } = request;

    // 只记录管理后台的写操作
    if (!user || user.type !== 'admin') return next.handle();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return next.handle();

    const module = this.extractModule(url);
    const action = this.mapAction(method);
    const resourceId = params?.id ? Number(params.id) : undefined;
    const ip = headers['x-forwarded-for'] || request.ip || request.connection?.remoteAddress;

    return next.handle().pipe(
      tap(() => {
        this.logService.createOperationLog({
          adminUserId: user.sub ?? user.id,
          action,
          module,
          resourceId,
          detail: { method, url, body },
          ip,
        });
      }),
    );
  }

  private extractModule(url: string): string {
    // /api/admin/xxx/... → xxx
    const parts = url.replace(/^\/api\//, '').split('/');
    // 跳过 admin 前缀，取下一个路径段
    const idx = parts.indexOf('admin');
    return idx >= 0 && parts.length > idx + 1 ? parts[idx + 1] : parts[0] || 'unknown';
  }

  private mapAction(method: string): string {
    switch (method) {
      case 'POST': return 'CREATE';
      case 'PUT':
      case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method;
    }
  }
}
