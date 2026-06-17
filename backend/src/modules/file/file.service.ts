import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import { CosService } from './cos.service';

@Injectable()
export class FileService {
  constructor(private readonly cosService: CosService) {}

  /**
   * 上传文件到 COS
   * @returns COS 公开访问 URL
   */
  async upload(file: Express.Multer.File): Promise<string> {
    const ext = extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const key = `uploads/${filename}`;

    return this.cosService.upload(key, file.buffer, file.mimetype);
  }
}
