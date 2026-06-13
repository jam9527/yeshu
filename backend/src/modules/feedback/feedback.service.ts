import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly repo: Repository<Feedback>,
  ) {}

  async create(userId: number, content: string, contact?: string, images?: string[]) {
    const feedback = this.repo.create({
      userId,
      content,
      contact: contact || undefined,
      images: images ? JSON.stringify(images) : undefined,
    });
    return this.repo.save(feedback);
  }

  async findAll(page = 1, pageSize = 10) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 10;
    const [records, total] = await this.repo.findAndCount({
      skip: (p - 1) * ps,
      take: ps,
      order: { createdAt: 'DESC' },
    });
    return { records, total, page: p, pageSize: ps };
  }
}
