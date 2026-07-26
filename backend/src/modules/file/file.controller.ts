import { Controller, Post, Get, Query, Res, UseInterceptors, UploadedFile, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { FileService } from './file.service';
import { CosService } from './cos.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly cosService: CosService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = await this.fileService.upload(file);
    return { url };
  }

  /**
   * COS 文件下载代理
   * 解决小程序 downloadFile 域名白名单限制：通过后端域名代理下载 COS 文件
   */
  @Public()
  @Get('download-proxy')
  async downloadProxy(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: '缺少 url 参数' });
    }

    try {
      // 从 COS URL 提取对象键
      const key = this.cosService.keyFromUrl(url);
      if (!key) {
        // 非 COS URL，尝试作为相对路径处理（兼容旧数据）
        return res.status(HttpStatus.BAD_REQUEST).json({ message: '不支持的文件地址' });
      }

      const body = await this.cosService.download(key);

      // 根据扩展名设置 Content-Type
      const ext = key.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
      };
      const contentType = mimeMap[ext || ''] || 'application/octet-stream';

      // 从 key 中提取原始文件名
      const filename = key.split('/').pop() || 'download';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', body.length);
      res.send(body);
    } catch (err) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: '文件下载失败' });
    }
  }
}
