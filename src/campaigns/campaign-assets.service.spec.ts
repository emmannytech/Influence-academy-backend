import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CampaignAssetsService } from './campaign-assets.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../uploads/storage.service';

const mockPrisma = {
  client: { findFirst: jest.fn() },
  creator: { findFirst: jest.fn() },
  campaign: { findUnique: jest.fn() },
  campaignAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  invitation: { findUnique: jest.fn() },
  $transaction: jest.fn().mockImplementation(async (fn) => fn(mockPrisma)),
};

const mockStorage = {
  uploadAsset: jest.fn(),
  delete: jest.fn(),
  getPublicUrl: jest.fn(
    (bucket: string, p: string) => `https://supabase/storage/v1/object/public/${bucket}/${p}`,
  ),
};

describe('CampaignAssetsService', () => {
  let service: CampaignAssetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignAssetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
      ],
    }).compile();
    service = module.get(CampaignAssetsService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  const mockFile = {
    originalname: 'brief.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('x'),
  } as Express.Multer.File;

  describe('uploadForClient', () => {
    it('uploads, persists row, returns DTO', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.count.mockResolvedValue(0);
      mockStorage.uploadAsset.mockResolvedValue({
        path: 'camp-1/abc.pdf',
        publicUrl: 'https://x/camp-1/abc.pdf',
      });
      mockPrisma.campaignAsset.create.mockResolvedValue({
        id: 'a1',
        campaignId: 'camp-1',
        fileName: 'brief.pdf',
        storagePath: 'camp-1/abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedAt: new Date('2026-04-17T00:00:00Z'),
      });

      const result = await service.uploadForClient('camp-1', 'supa', mockFile);

      expect(result.id).toBe('a1');
      expect(result.fileName).toBe('brief.pdf');
      expect(result.url).toContain('camp-1/abc.pdf');
      expect(mockStorage.uploadAsset).toHaveBeenCalledWith('campaigns', mockFile, 'camp-1');
    });

    it('rejects when campaign is submitted', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'submitted',
      });
      await expect(service.uploadForClient('camp-1', 'supa', mockFile))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects non-owner', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'other', status: 'draft',
      });
      await expect(service.uploadForClient('camp-1', 'supa', mockFile))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects at or over the 10-asset limit without uploading', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.count.mockResolvedValue(10);

      await expect(service.uploadForClient('camp-1', 'supa', mockFile))
        .rejects.toThrow(ConflictException);
      // Pre-check bails before touching storage
      expect(mockStorage.uploadAsset).not.toHaveBeenCalled();
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });

    it('cleans up storage if DB create fails', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.count.mockResolvedValue(0);
      mockStorage.uploadAsset.mockResolvedValue({
        path: 'camp-1/abc.pdf', publicUrl: 'x',
      });
      mockPrisma.campaignAsset.create.mockRejectedValue(new Error('DB down'));

      await expect(service.uploadForClient('camp-1', 'supa', mockFile)).rejects.toThrow();
      expect(mockStorage.delete).toHaveBeenCalledWith('campaigns', 'camp-1/abc.pdf');
    });

    it('succeeds at count boundary (9 existing → 10th uploaded)', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.count.mockResolvedValue(9);
      mockStorage.uploadAsset.mockResolvedValue({
        path: 'camp-1/abc.pdf', publicUrl: 'x',
      });
      mockPrisma.campaignAsset.create.mockResolvedValue({
        id: 'a1',
        campaignId: 'camp-1',
        fileName: 'brief.pdf',
        storagePath: 'camp-1/abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedAt: new Date(),
      });
      await expect(
        service.uploadForClient('camp-1', 'supa', mockFile),
      ).resolves.toMatchObject({ id: 'a1' });
    });

    it('does not create when storage.uploadAsset throws', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.count.mockResolvedValue(0);
      mockStorage.uploadAsset.mockRejectedValue(new Error('storage explode'));

      await expect(
        service.uploadForClient('camp-1', 'supa', mockFile),
      ).rejects.toThrow('storage explode');

      expect(mockPrisma.campaignAsset.create).not.toHaveBeenCalled();
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });
  });

  describe('listForClient', () => {
    it('returns assets for owner', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        clientId: 'client-1',
        assets: [
          {
            id: 'a1',
            campaignId: 'camp-1',
            fileName: 'brief.pdf',
            storagePath: 'camp-1/abc.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 100,
            uploadedAt: new Date(),
          },
        ],
      });
      const result = await service.listForClient('camp-1', 'supa');
      expect(result).toHaveLength(1);
      expect(result[0].url).toContain('camp-1/abc.pdf');
    });

    it('returns empty array when no assets', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        clientId: 'client-1',
        assets: [],
      });
      await expect(service.listForClient('camp-1', 'supa')).resolves.toEqual([]);
    });
  });

  describe('deleteForClient', () => {
    it('deletes row then storage', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.findUnique.mockResolvedValue({
        id: 'a1', campaignId: 'camp-1', storagePath: 'camp-1/abc.pdf',
      });
      mockPrisma.campaignAsset.delete.mockResolvedValue({});
      mockStorage.delete.mockResolvedValue(undefined);

      await service.deleteForClient('camp-1', 'a1', 'supa');

      expect(mockPrisma.campaignAsset.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(mockStorage.delete).toHaveBeenCalledWith('campaigns', 'camp-1/abc.pdf');
    });

    it('rejects when status is active', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'active',
      });
      await expect(service.deleteForClient('camp-1', 'a1', 'supa'))
        .rejects.toThrow(BadRequestException);
    });

    it('404 if asset not on this campaign', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignAsset.findUnique.mockResolvedValue({
        id: 'a1', campaignId: 'other-camp', storagePath: 'x',
      });
      await expect(service.deleteForClient('camp-1', 'a1', 'supa'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('listForAdmin', () => {
    it('returns assets without ownership check', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'camp-1' });
      mockPrisma.campaignAsset.findMany.mockResolvedValue([]);
      await expect(service.listForAdmin('camp-1')).resolves.toEqual([]);
    });

    it('404 if campaign missing', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.listForAdmin('camp-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listForCreator', () => {
    it('returns assets for pending invitation', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: 'creator-1' });
      mockPrisma.invitation.findUnique.mockResolvedValue({ status: 'pending' });
      mockPrisma.campaignAsset.findMany.mockResolvedValue([]);
      await expect(service.listForCreator('camp-1', 'supa')).resolves.toEqual([]);
    });

    it('returns assets for accepted invitation', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: 'creator-1' });
      mockPrisma.invitation.findUnique.mockResolvedValue({ status: 'accepted' });
      mockPrisma.campaignAsset.findMany.mockResolvedValue([]);
      await expect(service.listForCreator('camp-1', 'supa')).resolves.toEqual([]);
    });

    it('403 for declined invitation', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: 'creator-1' });
      mockPrisma.invitation.findUnique.mockResolvedValue({ status: 'declined' });
      await expect(service.listForCreator('camp-1', 'supa'))
        .rejects.toThrow(ForbiddenException);
    });

    it('403 if no invitation exists', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: 'creator-1' });
      mockPrisma.invitation.findUnique.mockResolvedValue(null);
      await expect(service.listForCreator('camp-1', 'supa'))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
