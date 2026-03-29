import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  client: { findFirst: jest.fn(), findUnique: jest.fn() },
  campaign: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  campaignStatusLog: { create: jest.fn(), findMany: jest.fn() },
};

const mockEventEmitter = { emit: jest.fn() };

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a draft campaign', async () => {
      const clientId = 'client-1';
      mockPrisma.client.findFirst.mockResolvedValue({ id: clientId });

      const campaign = {
        id: 'camp-1',
        clientId,
        title: 'Test Campaign',
        status: 'draft',
      };
      mockPrisma.campaign.create.mockResolvedValue(campaign);
      mockPrisma.campaignStatusLog.create.mockResolvedValue({});

      const result = await service.create('supabase-id', {
        title: 'Test Campaign',
      });

      expect(result.title).toBe('Test Campaign');
      expect(result.status).toBe('draft');
      expect(mockPrisma.campaignStatusLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ toStatus: 'draft' }),
        }),
      );
    });

    it('should throw if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      await expect(
        service.create('unknown', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw ForbiddenException for non-owner', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        clientId: 'other-client',
      });

      await expect(service.findOne('camp-1', 'supabase-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for missing campaign', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne('camp-1', 'supabase-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should reject updates on non-editable status', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        clientId: 'client-1',
        status: 'active',
      });

      await expect(
        service.update('camp-1', 'supabase-id', { title: 'New' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should reject submission with missing required fields', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        clientId: 'client-1',
        status: 'draft',
        title: 'Test',
        description: null,
        platforms: [],
        numberOfCreators: null,
        timeline: null,
      });

      await expect(service.submit('camp-1', 'supabase-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
