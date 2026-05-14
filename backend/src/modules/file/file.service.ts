import { Injectable } from '@nestjs/common';

@Injectable()
export class FileService {
  async upload(file: Express.Multer.File): Promise<string> {
    return `/uploads/${file.filename}`;
  }
}
