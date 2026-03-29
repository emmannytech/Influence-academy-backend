import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  creator: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  campaign: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockCreator = {
  id: 'creator-1',
  fullName: 'Jane Doe',
  country: 'Nigeria',
  city: 'Lagos',
  bio: 'Content creator',
  niches: ['fashion', 'beauty'],
  socialHandles: { instagram: '@janedoe' },
  createdAt: new Date('2025-01-01'),
};

const mockCampaign = {
  id: 'camp-1',
  title: 'Summer Campaign',
  description: 'A summer promo campaign',
  platforms: ['instagram'],
  numberOfCreators: 5,
  budget: 10000,
  timeline: '2025-06-01',
  status: 'active',
  createdAt: new Date('2025-01-15'),
  client: { companyName: 'Acme Corp', companyType: 'brand' },
};

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    jest.clearAllMocks();
  });

  describe('findCreators', () => {
    it('should return paginated list of approved creators', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([mockCreator]);
      mockPrisma.creator.count.mockResolvedValue(1);

      const result = await service.findCreators({});

      expect(result.items).toEqual([mockCreator]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);

      expect(mockPrisma.creator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'approved' }),
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrisma.creator.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'approved' }),
      });
    });

    it('should apply search filter across multiple fields', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([mockCreator]);
      mockPrisma.creator.count.mockResolvedValue(1);

      await service.findCreators({ search: 'Jane' });

      const calledWhere = mockPrisma.creator.findMany.mock.calls[0][0].where;
      expect(calledWhere.status).toBe('approved');
      expect(calledWhere.AND).toBeDefined();

      const orClause = calledWhere.AND[1].OR;
      expect(orClause).toEqual(
        expect.arrayContaining([
          { fullName: { contains: 'Jane', mode: 'insensitive' } },
          { bio: { contains: 'Jane', mode: 'insensitive' } },
          { city: { contains: 'Jane', mode: 'insensitive' } },
          { niches: { has: 'Jane' } },
        ]),
      );
    });

    it('should apply country filter', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([mockCreator]);
      mockPrisma.creator.count.mockResolvedValue(1);

      await service.findCreators({ country: 'Nigeria' });

      const calledWhere = mockPrisma.creator.findMany.mock.calls[0][0].where;
      expect(calledWhere.status).toBe('approved');
      expect(calledWhere.country).toEqual({
        contains: 'Nigeria',
        mode: 'insensitive',
      });
    });
  });

  describe('findOneCreator', () => {
    it('should return an approved creator by id', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(mockCreator);

      const result = await service.findOneCreator('creator-1');

      expect(result).toEqual(mockCreator);
      expect(mockPrisma.creator.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'creator-1', status: 'approved' },
        }),
      );
    });

    it('should throw NotFoundException when creator not found', async () => {
      mockPrisma.creator.findFirst.mockResolvedValue(null);

      await expect(service.findOneCreator('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when creator is not approved', async () => {
      // findFirst filters by status: 'approved', so a non-approved creator
      // will return null from the query
      mockPrisma.creator.findFirst.mockResolvedValue(null);

      await expect(service.findOneCreator('draft-creator-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.creator.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft-creator-id', status: 'approved' },
        }),
      );
    });
  });

  describe('findCampaigns', () => {
    it('should return only active campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([mockCampaign]);
      mockPrisma.campaign.count.mockResolvedValue(1);

      const result = await service.findCampaigns({});

      expect(result.items).toEqual([mockCampaign]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);

      const calledWhere = mockPrisma.campaign.findMany.mock.calls[0][0].where;
      expect(calledWhere.status).toBe('active');

      expect(mockPrisma.campaign.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'active',
        }),
      });
    });
  });
});
