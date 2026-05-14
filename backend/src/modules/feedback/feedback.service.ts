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

  async create(userId: number, content: string, images?: string[]) {
    const feedback = this.repo.create({
      userId,
      content,
      images: images ? JSON.stringify(images) : undefined,
    });
    return this.repo.save(feedback);
  }

  async findAll(page = 1, pageSize = 10) {
    const [records, total] = await this.repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { records, total, page, pageSize };
  }
}
