import { Module, Global } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { CosService } from './cos.service';

@Global()
@Module({
  controllers: [FileController],
  providers: [FileService, CosService],
  exports: [FileService, CosService],
})
export class FileModule {}
