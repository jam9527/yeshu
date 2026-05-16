import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';

@Injectable()
export class VerifierGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // 从数据库查询最新 isVerifier 状态，避免 JWT 过期问题
    const dbUser = await this.userRepo.findOne({ where: { id: user.id || user.sub } });
    if (!dbUser || !dbUser.isVerifier) {
      throw new ForbiddenException('仅核销员可执行此操作');
    }

    return true;
  }
}
