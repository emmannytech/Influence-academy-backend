import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockUpload = jest.fn();
const mockRemove = jest.fn();

const mockSupabaseService = {
  getAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
      }),
    },
  }),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('https://test.supabase.co'),
};

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    const validFile = {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    it('should upload a file and return path + publicUrl', async () => {
      mockUpload.mockResolvedValue({ error: null });

      const result = await service.upload('avatars', validFile, 'user-123');

      expect(result.path).toMatch(/^user-123\/.*\.png$/);
      expect(result.publicUrl).toContain('https://test.supabase.co/storage/v1/object/public/avatars/');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-123\/.+\.png$/),
        validFile.buffer,
        { contentType: 'image/png', upsert: false },
      );
    });

    it('should reject invalid file types', async () => {
      const pdfFile = {
        ...validFile,
        mimetype: 'application/pdf',
        originalname: 'doc.pdf',
      } as Express.Multer.File;

      await expect(service.upload('avatars', pdfFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should reject files over 5MB', async () => {
      const largeFile = {
        ...validFile,
        size: 6 * 1024 * 1024,
      } as Express.Multer.File;

      await expect(service.upload('avatars', largeFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should throw on Supabase upload error', async () => {
      mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } });

      await expect(service.upload('avatars', validFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      mockRemove.mockResolvedValue({ error: null });

      await service.delete('avatars', 'user-123/photo.png');

      expect(mockRemove).toHaveBeenCalledWith(['user-123/photo.png']);
    });

    it('should throw on Supabase delete error', async () => {
      mockRemove.mockResolvedValue({ error: { message: 'Not found' } });

      await expect(
        service.delete('avatars', 'user-123/photo.png'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicUrl', () => {
    it('should return the correct public URL', () => {
      const url = service.getPublicUrl('avatars', 'user-123/photo.png');
      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/public/avatars/user-123/photo.png',
      );
    });
  });

  describe('uploadAsset', () => {
    it('accepts PDF under 15 MB', async () => {
      const file = {
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024,
        originalname: 'brief.pdf',
        buffer: Buffer.from('pdf'),
      } as Express.Multer.File;

      mockUpload.mockResolvedValue({ error: null });

      const result = await service.uploadAsset('campaigns', file, 'camp-1');

      expect(result.path).toMatch(/camp-1\/.+\.pdf$/);
      expect(result.publicUrl).toContain('/storage/v1/object/public/campaigns/camp-1/');
    });

    it('accepts docx', async () => {
      const file = {
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
        originalname: 'brief.docx',
        buffer: Buffer.from('docx'),
      } as Express.Multer.File;
      mockUpload.mockResolvedValue({ error: null });

      const result = await service.uploadAsset('campaigns', file, 'camp-1');

      expect(result.path).toMatch(/\.docx$/);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        file.buffer,
        expect.objectContaining({
          contentType: file.mimetype,
          upsert: false,
        }),
      );
    });

    it('accepts zip', async () => {
      const file = {
        mimetype: 'application/zip',
        size: 1024,
        originalname: 'pack.zip',
        buffer: Buffer.from('zip'),
      } as Express.Multer.File;
      mockUpload.mockResolvedValue({ error: null });

      const result = await service.uploadAsset('campaigns', file, 'camp-1');

      expect(result.path).toMatch(/\.zip$/);
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        file.buffer,
        expect.objectContaining({
          contentType: file.mimetype,
          upsert: false,
        }),
      );
    });

    it('rejects executables', async () => {
      const file = {
        mimetype: 'application/x-msdownload',
        size: 1024,
        originalname: 'evil.exe',
        buffer: Buffer.from('x'),
      } as Express.Multer.File;
      await expect(service.uploadAsset('campaigns', file, 'c')).rejects.toThrow(
        /Invalid file type/,
      );
    });

    it('rejects files over 15 MB', async () => {
      const file = {
        mimetype: 'application/pdf',
        size: 16 * 1024 * 1024,
        originalname: 'big.pdf',
        buffer: Buffer.from('x'),
      } as Express.Multer.File;
      await expect(service.uploadAsset('campaigns', file, 'c')).rejects.toThrow(
        /too large/i,
      );
    });

    it('rejects files with no extension', async () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'brief',
        buffer: Buffer.from('x'),
      } as Express.Multer.File;
      await expect(service.uploadAsset('campaigns', file, 'c')).rejects.toThrow(
        /missing a file extension/,
      );
    });
  });
});
