import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CampaignKpisService } from './kpis.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = {
  client: { findFirst: jest.fn() },
  campaign: { findUnique: jest.fn() },
  campaignKpi: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (fn) => fn(mockPrisma)),
};

describe('CampaignKpisService', () => {
  let service: CampaignKpisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignKpisService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CampaignKpisService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('listForClient', () => {
    it('returns post target + metrics separated', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignKpi.findMany.mockResolvedValue([
        { type: 'posts', targetValue: 3 },
        { type: 'reach', targetValue: 50000 },
        { type: 'impressions', targetValue: 100000 },
      ]);

      const result = await service.listForClient('camp-1', 'supa');

      expect(result.postTarget).toBe(3);
      expect(result.metrics).toEqual([
        { type: 'reach', targetValue: 50000 },
        { type: 'impressions', targetValue: 100000 },
      ]);
    });

    it('defaults postTarget to 1 when no posts row', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignKpi.findMany.mockResolvedValue([]);
      const result = await service.listForClient('camp-1', 'supa');
      expect(result.postTarget).toBe(1);
      expect(result.metrics).toEqual([]);
    });

    it('throws Forbidden for non-owner', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'other', status: 'draft',
      });
      await expect(service.listForClient('camp-1', 'supa'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('replaceForClient', () => {
    const dto = {
      postTarget: 3,
      metrics: [{ type: 'reach' as const, targetValue: 50000 }],
    };

    it('replaces KPI rows in a transaction', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'draft',
      });
      mockPrisma.campaignKpi.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.campaignKpi.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.campaignKpi.findMany.mockResolvedValue([
        { type: 'posts', targetValue: 3 },
        { type: 'reach', targetValue: 50000 },
      ]);

      const result = await service.replaceForClient('camp-1', 'supa', dto);

      expect(mockPrisma.campaignKpi.deleteMany).toHaveBeenCalledWith({
        where: { campaignId: 'camp-1' },
      });
      expect(mockPrisma.campaignKpi.createMany).toHaveBeenCalledWith({
        data: [
          { campaignId: 'camp-1', type: 'posts', targetValue: 3 },
          { campaignId: 'camp-1', type: 'reach', targetValue: 50000 },
        ],
      });
      expect(result.postTarget).toBe(3);
    });

    it('rejects when campaign is submitted', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1', clientId: 'client-1', status: 'submitted',
      });
      await expect(service.replaceForClient('camp-1', 'supa', dto))
        .rejects.toThrow(BadRequestException);
    });

    it('404 when campaign missing', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.replaceForClient('camp-1', 'supa', dto))
        .rejects.toThrow(NotFoundException);
    });
  });
});
