import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** Upload a single file. Returns { url: string } */
  @Post('single')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder = 'uploads',
  ): Promise<{ url: string }> {
    const url = await this.uploadService.uploadOne(file, folder);
    return { url };
  }

  /** Upload multiple files (max 10). Returns { urls: string[] } */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder = 'uploads',
  ): Promise<{ urls: string[] }> {
    const urls = await this.uploadService.uploadMany(files, folder);
    return { urls };
  }
}
