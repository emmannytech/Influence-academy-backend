import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignDeliverablesService } from './deliverables.service';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../uploads/storage.service';

const mockPrisma = {
  client: { findFirst: jest.fn() },
  creator: { findFirst: jest.fn(), findUnique: jest.fn() },
  campaign: { findUnique: jest.fn() },
  invitation: { findUnique: jest.fn(), findMany: jest.fn() },
  campaignKpi: { findMany: jest.fn() },
  campaignPostSubmission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  campaignPostProof: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  campaignMetricOverride: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  campaignMetricProof: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockStorage = {
  uploadAsset: jest.fn(),
  delete: jest.fn(),
  getPublicUrl: jest.fn(
    (bucket: string, p: string) => `https://x/${bucket}/${p}`,
  ),
};

const mockEventEmitter = { emit: jest.fn() };

describe('CampaignDeliverablesService', () => {
  let service: CampaignDeliverablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignDeliverablesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();
    service = module.get(CampaignDeliverablesService);
    jest.clearAllMocks();
  });

  const activeCampaign = {
    id: 'camp-1', clientId: 'client-1', status: 'active', title: 'Test',
  };
  const draftCampaign = { ...activeCampaign, status: 'draft' };
  const creator = { id: 'creator-1' };
  const acceptedInvitation = { status: 'accepted' };

  describe('submitPost', () => {
    const dto = {
      platform: 'instagram',
      postUrl: 'https://instagram.com/p/x',
      reach: 10000,
      impressions: 20000,
    };

    it('creates a pending submission', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      mockPrisma.campaignPostSubmission.create.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1',
        platform: 'instagram', postUrl: dto.postUrl,
        postedAt: null, reach: 10000, impressions: 20000,
        views: null, engagement: null, clicks: null, conversions: null,
        status: 'pending', reviewNote: null,
        submittedAt: new Date(), reviewedAt: null, proofs: [],
      });

      const result = await service.submitPost('camp-1', 'supa', dto);
      expect(result.status).toBe('pending');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'campaign.post.submitted',
        expect.objectContaining({ submissionId: 'sub-1' }),
      );
    });

    it('rejects when campaign not active', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaign.findUnique.mockResolvedValue(draftCampaign);
      await expect(service.submitPost('camp-1', 'supa', dto))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects when invitation not accepted', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue({ status: 'pending' });
      await expect(service.submitPost('camp-1', 'supa', dto))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePost', () => {
    it('allows edit on pending submission', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'pending',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      mockPrisma.campaignPostSubmission.update.mockResolvedValue({
        id: 'sub-1', status: 'pending', proofs: [],
        campaignId: 'camp-1', creatorId: 'creator-1',
        platform: 'instagram', postUrl: 'x', postedAt: null,
        reach: null, impressions: null, views: null, engagement: null,
        clicks: null, conversions: null, reviewNote: null,
        submittedAt: new Date(), reviewedAt: null,
      });
      await expect(service.updatePost('sub-1', 'supa', { reach: 5000 }))
        .resolves.toBeDefined();
    });

    it('resets rejected to pending and clears review note', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1',
        status: 'rejected', reviewNote: 'bad screenshot',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      mockPrisma.campaignPostSubmission.update.mockResolvedValue({
        id: 'sub-1', status: 'pending', reviewNote: null, proofs: [],
        campaignId: 'camp-1', creatorId: 'creator-1',
        platform: 'instagram', postUrl: 'x', postedAt: null,
        reach: null, impressions: null, views: null, engagement: null,
        clicks: null, conversions: null,
        submittedAt: new Date(), reviewedAt: null,
      });

      await service.updatePost('sub-1', 'supa', { reach: 5000 });

      expect(mockPrisma.campaignPostSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          status: 'pending', reviewNote: null, reviewedAt: null,
        }),
        include: { proofs: true },
      });
    });

    it('rejects edit on approved submission', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'approved',
      });
      await expect(service.updatePost('sub-1', 'supa', { reach: 5000 }))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects edit by non-owner creator', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue({ id: 'other-creator' });
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'pending',
      });
      await expect(service.updatePost('sub-1', 'supa', { reach: 5000 }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewPost', () => {
    it('approves with no note required', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'pending',
      });
      mockPrisma.campaignPostSubmission.update.mockResolvedValue({
        id: 'sub-1', status: 'approved', proofs: [],
        campaignId: 'camp-1', creatorId: 'creator-1',
        platform: 'instagram', postUrl: 'x', postedAt: null,
        reach: null, impressions: null, views: null, engagement: null,
        clicks: null, conversions: null, reviewNote: null,
        submittedAt: new Date(), reviewedAt: new Date(),
      });

      const result = await service.reviewPost('camp-1', 'sub-1', 'supa', { action: 'approve' });
      expect(result.status).toBe('approved');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'campaign.post.reviewed',
        expect.objectContaining({ status: 'approved' }),
      );
    });

    it('reject requires a note', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', status: 'pending',
      });
      await expect(service.reviewPost('camp-1', 'sub-1', 'supa', { action: 'reject' }))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects when submission already reviewed', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', status: 'approved',
      });
      await expect(service.reviewPost('camp-1', 'sub-1', 'supa', { action: 'approve' }))
        .rejects.toThrow(BadRequestException);
    });

    it('404 when submission not on this campaign', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'other-camp', status: 'pending',
      });
      await expect(service.reviewPost('camp-1', 'sub-1', 'supa', { action: 'approve' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertOverride', () => {
    it('creates override', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      mockPrisma.campaignMetricOverride.upsert.mockResolvedValue({
        id: 'ov-1', campaignId: 'camp-1', creatorId: 'creator-1',
        type: 'clicks', reportedValue: 450, note: 'UTM',
        status: 'pending', reviewNote: null,
        createdAt: new Date(), reviewedAt: null, proofs: [],
      });

      const result = await service.upsertOverride('camp-1', 'supa', {
        type: 'clicks' as const, reportedValue: 450, note: 'UTM',
      });
      expect(result.reportedValue).toBe(450);
      expect(result.status).toBe('pending');
    });

    it('rejects when posts type', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      await expect(service.upsertOverride('camp-1', 'supa', {
        type: 'posts' as const, reportedValue: 3,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewOverride', () => {
    it('approves', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignMetricOverride.findUnique.mockResolvedValue({
        id: 'ov-1', campaignId: 'camp-1', status: 'pending',
      });
      mockPrisma.campaignMetricOverride.update.mockResolvedValue({
        id: 'ov-1', campaignId: 'camp-1', creatorId: 'creator-1',
        type: 'clicks', reportedValue: 450, note: null,
        status: 'approved', reviewNote: null,
        createdAt: new Date(), reviewedAt: new Date(), proofs: [],
      });
      await expect(service.reviewOverride('camp-1', 'ov-1', 'supa', { action: 'approve' }))
        .resolves.toMatchObject({ status: 'approved' });
    });
  });

  describe('getCreatorBundle', () => {
    it('returns progress + posts + overrides for caller', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.invitation.findUnique.mockResolvedValue(acceptedInvitation);
      mockPrisma.campaignKpi.findMany.mockResolvedValue([
        { type: 'posts', targetValue: 3 },
        { type: 'reach', targetValue: 50000 },
      ]);
      mockPrisma.campaignPostSubmission.findMany.mockResolvedValue([
        {
          id: 'sub-1', status: 'approved', reach: 20000, proofs: [],
          campaignId: 'camp-1', creatorId: 'creator-1',
          platform: 'instagram', postUrl: 'x', postedAt: null,
          impressions: null, views: null, engagement: null,
          clicks: null, conversions: null, reviewNote: null,
          submittedAt: new Date(), reviewedAt: new Date(),
        },
        {
          id: 'sub-2', status: 'pending', reach: 5000, proofs: [],
          campaignId: 'camp-1', creatorId: 'creator-1',
          platform: 'instagram', postUrl: 'x', postedAt: null,
          impressions: null, views: null, engagement: null,
          clicks: null, conversions: null, reviewNote: null,
          submittedAt: new Date(), reviewedAt: null,
        },
      ]);
      mockPrisma.campaignMetricOverride.findMany.mockResolvedValue([]);

      const result = await service.getCreatorBundle('camp-1', 'supa');
      expect(result.posts).toHaveLength(2);
      const reachProgress = result.progress.find((p) => p.type === 'reach');
      expect(reachProgress?.approvedValue).toBe(20000);
      expect(reachProgress?.pendingValue).toBe(5000);
      expect(reachProgress?.done).toBe(false);
    });
  });

  describe('getClientBundle', () => {
    it('groups submissions by creator with progress', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findMany.mockResolvedValue([
        { creatorId: 'creator-1', creator: { id: 'creator-1', fullName: 'Sarah' } },
        { creatorId: 'creator-2', creator: { id: 'creator-2', fullName: 'Mike' } },
      ]);
      mockPrisma.campaignKpi.findMany.mockResolvedValue([{ type: 'posts', targetValue: 3 }]);
      mockPrisma.campaignPostSubmission.findMany.mockResolvedValue([
        {
          id: 'sub-1', status: 'pending', reach: null, proofs: [],
          campaignId: 'camp-1', creatorId: 'creator-1',
          platform: 'instagram', postUrl: 'x', postedAt: null,
          impressions: null, views: null, engagement: null,
          clicks: null, conversions: null, reviewNote: null,
          submittedAt: new Date(), reviewedAt: null,
        },
      ]);
      mockPrisma.campaignMetricOverride.findMany.mockResolvedValue([]);

      const result = await service.getClientBundle('camp-1', 'supa');
      expect(result.creators).toHaveLength(2);
      expect(result.totalPending).toBe(1);
      const sarah = result.creators.find((c) => c.creatorId === 'creator-1')!;
      expect(sarah.posts).toHaveLength(1);
      const mike = result.creators.find((c) => c.creatorId === 'creator-2')!;
      expect(mike.posts).toHaveLength(0);
    });
  });

  describe('proof uploads', () => {
    const mockFile = {
      originalname: 'screen.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('x'),
    } as Express.Multer.File;

    it('addPostProof uploads and persists', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'pending',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockStorage.uploadAsset.mockResolvedValue({
        path: 'camp-1/proofs/posts/sub-1/abc.png', publicUrl: 'x',
      });
      mockPrisma.campaignPostProof.create.mockResolvedValue({
        id: 'p-1', submissionId: 'sub-1', fileName: 'screen.png',
        storagePath: 'camp-1/proofs/posts/sub-1/abc.png',
        mimeType: 'image/png', sizeBytes: 1024, uploadedAt: new Date(),
      });

      const result = await service.addPostProof('sub-1', 'supa', mockFile);
      expect(result.id).toBe('p-1');
    });

    it('addPostProof rejects on approved submission', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'approved',
      });
      await expect(service.addPostProof('sub-1', 'supa', mockFile))
        .rejects.toThrow(BadRequestException);
    });

    it('removePostProof deletes DB row then storage', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(creator);
      mockPrisma.campaignPostSubmission.findUnique.mockResolvedValue({
        id: 'sub-1', campaignId: 'camp-1', creatorId: 'creator-1', status: 'pending',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.campaignPostProof.findUnique.mockResolvedValue({
        id: 'p-1', submissionId: 'sub-1',
        storagePath: 'camp-1/proofs/posts/sub-1/abc.png',
      });
      mockPrisma.campaignPostProof.delete.mockResolvedValue({});
      mockStorage.delete.mockResolvedValue(undefined);

      await service.removePostProof('sub-1', 'p-1', 'supa');

      expect(mockPrisma.campaignPostProof.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
      expect(mockStorage.delete).toHaveBeenCalled();
    });
  });

  describe('getAdminBundle', () => {
    it('returns same shape as client, no ownership check', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(activeCampaign);
      mockPrisma.invitation.findMany.mockResolvedValue([]);
      mockPrisma.campaignKpi.findMany.mockResolvedValue([]);
      mockPrisma.campaignPostSubmission.findMany.mockResolvedValue([]);
      mockPrisma.campaignMetricOverride.findMany.mockResolvedValue([]);

      const result = await service.getAdminBundle('camp-1');
      expect(result.creators).toEqual([]);
    });

    it('404 when campaign missing', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.getAdminBundle('camp-1')).rejects.toThrow(NotFoundException);
    });
  });
});
