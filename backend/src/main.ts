import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * 椰树集团参观预约小程序 - 后端服务入口
 *
 * 启动说明:
 * 1. 确保 MySQL 和 Redis 已启动
 * 2. 复制 .env.example 为 .env 并填写配置
 * 3. 运行 npm run start:dev 启动开发服务器
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 全局路由前缀: /api
  app.setGlobalPrefix('api');

  // 确保上传目录存在
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // 静态文件服务（上传目录）
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // 全局参数校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // 全局响应格式统一拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 跨域配置
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`椰树预约小程序后端服务已启动: http://localhost:${port}`);
}
bootstrap();
