import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** 推广海报模板表 */
@Entity('promotion_posters')
export class PromotionPoster {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 100, comment: '海报名称（管理后台标识）' })
  name: string;

  @Column({ length: 500, comment: '背景图片路径（/uploads/...）' })
  backgroundUrl: string;

  @Column({ type: 'text', comment: '文字配置 JSON：[{content,x,y,fontSize,color,fontWeight,textAlign}]' })
  textConfig: string;

  @Column({ type: 'text', comment: '二维码配置 JSON：{x,y,size}' })
  qrConfig: string;

  @Column({ default: false, comment: '是否启用（全局仅一张启用）' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
