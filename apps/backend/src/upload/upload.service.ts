import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('DO_SPACES_ENDPOINT');
    const region = this.config.get<string>('DO_SPACES_REGION');
    const accessKeyId = this.config.get<string>('DO_SPACES_KEY');
    const secretAccessKey = this.config.get<string>('DO_SPACES_SECRET');
    this.bucket = this.config.get<string>('DO_SPACES_BUCKET');
    this.baseUrl = `https://${this.bucket}.${region}.digitaloceanspaces.com`;

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false,
    });
  }

  async uploadOne(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    return `${this.baseUrl}/${key}`;
  }

  async uploadMany(
    files: Express.Multer.File[],
    folder = 'uploads',
  ): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadOne(f, folder)));
  }
}
