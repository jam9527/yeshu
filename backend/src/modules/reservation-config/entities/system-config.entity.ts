import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 50, unique: true })
  configKey: string;

  @Column({ length: 255 })
  configValue: string;

  @Column({ length: 255, nullable: true, comment: '配置说明' })
  description: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
