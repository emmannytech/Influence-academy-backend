import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { randomUUID } from 'crypto';
import * as path from 'path';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class StorageService {
  private supabaseUrl: string;

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
  }

  async upload(
    bucket: string,
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `${randomUUID()}${ext}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const client = this.supabaseService.getAdminClient();

    const { error } = await client.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

    return { path: filePath, publicUrl };
  }

  async delete(bucket: string, filePath: string): Promise<void> {
    const client = this.supabaseService.getAdminClient();

    const { error } = await client.storage.from(bucket).remove([filePath]);

    if (error) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  getPublicUrl(bucket: string, filePath: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
  }
}
