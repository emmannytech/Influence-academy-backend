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

const ALLOWED_ASSET_MIME = [
  ...ALLOWED_IMAGE_TYPES,
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  // legacy IE / older Windows alias for zip — kept for browser compatibility
  'application/x-zip-compressed',
];

const MAX_ASSET_SIZE = 15 * 1024 * 1024; // 15 MB

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
    return this.uploadWithPolicy(bucket, file, folder, {
      allowedMimes: ALLOWED_IMAGE_TYPES,
      maxSize: MAX_FILE_SIZE,
    });
  }

  async uploadAsset(
    bucket: string,
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    return this.uploadWithPolicy(bucket, file, folder, {
      allowedMimes: ALLOWED_ASSET_MIME,
      maxSize: MAX_ASSET_SIZE,
    });
  }

  private async uploadWithPolicy(
    bucket: string,
    file: Express.Multer.File,
    folder: string | undefined,
    policy: {
      allowedMimes: readonly string[];
      maxSize: number;
    },
  ): Promise<UploadResult> {
    if (!policy.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed: ${policy.allowedMimes.join(', ')}`,
      );
    }

    if (file.size > policy.maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${policy.maxSize / (1024 * 1024)}MB`,
      );
    }

    const ext = path.extname(file.originalname);
    if (!ext) {
      throw new BadRequestException(
        `File '${file.originalname}' is missing a file extension`,
      );
    }

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
