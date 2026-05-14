import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

/**
 * TypeORM 数据库连接配置
 *
 * 实体文件自动扫描加载，新增实体无需手动注册
 * 开发环境开启 synchronize 自动同步表结构（生产环境需关闭并用 migration）
 */
/**
 * 判断当前环境是否可以通过 TCP 连接 MySQL
 * 非 Windows 或明确指定 DB_HOST 时使用 TCP
 */
const useTcp = () => {
  if (process.env.DB_HOST) return true;
  return process.platform !== 'win32';
};

const baseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'yeshu_reservation',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  charset: 'utf8mb4',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  timezone: '+08:00',
  extra: { charset: 'utf8mb4' },
};

export const typeOrmConfig: TypeOrmModuleOptions = useTcp()
  ? baseConfig
  : {
      ...baseConfig,
      host: undefined,
      port: undefined,
      extra: { ...baseConfig.extra, socketPath: '\\\\.\\pipe\\MySQL' },
    };
