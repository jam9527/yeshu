import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';
import { config } from 'dotenv';

// 确保 .env 在 ConfigModule 加载前已生效，避免 TypeORM 走 named pipe
config();

/**
 * TypeORM 数据库连接配置
 *
 * 实体文件自动扫描加载，新增实体无需手动注册
 * 开发环境开启 synchronize 自动同步表结构（生产环境需关闭并用 migration）
 */
const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 3306;

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host,
  port,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'yeshu_reservation',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  charset: 'utf8mb4',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  timezone: '+08:00',
  extra: { charset: 'utf8mb4', connectionLimit: 20 },
};
