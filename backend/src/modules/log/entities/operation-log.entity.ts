import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** 管理后台操作日志表 */
@Entity('admin_operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '管理员用户ID' })
  adminUserId: number;

  @Column({ length: 64, comment: '操作类型: CREATE/UPDATE/DELETE/APPROVE/REJECT' })
  action: string;

  @Column({ length: 64, comment: '操作模块' })
  module: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: '操作资源ID' })
  resourceId: number;

  @Column({ type: 'json', nullable: true, comment: '操作详情' })
  detail: any;

  @Column({ length: 64, nullable: true, comment: 'IP 地址' })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;
}
