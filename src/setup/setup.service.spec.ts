import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SetupService } from './setup.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  setupItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockItem = (overrides = {}) => ({
  id: 'item-1',
  label: 'Nigeria',
  value: 'nigeria',
  sortOrder: 10,
  ...overrides,
});

describe('SetupService', () => {
  let service: SetupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active items grouped by category', async () => {
      const countryItem = mockItem();
      const nicheItem = mockItem({
        id: 'item-2',
        label: 'Fashion',
        value: 'fashion',
      });
      const platformItem = mockItem({
        id: 'item-3',
        label: 'Instagram',
        value: 'instagram',
      });
      const industryItem = mockItem({
        id: 'item-4',
        label: 'Technology',
        value: 'technology',
      });

      mockPrisma.setupItem.findMany
        .mockResolvedValueOnce([countryItem])
        .mockResolvedValueOnce([nicheItem])
        .mockResolvedValueOnce([platformItem])
        .mockResolvedValueOnce([industryItem]);

      const result = await service.findAll();

      expect(result.countries).toEqual([countryItem]);
      expect(result.niches).toEqual([nicheItem]);
      expect(result.platforms).toEqual([platformItem]);
      expect(result.industries).toEqual([industryItem]);
      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledTimes(4);
    });

    it('should return empty arrays when no items exist', async () => {
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result.countries).toEqual([]);
      expect(result.niches).toEqual([]);
      expect(result.platforms).toEqual([]);
      expect(result.industries).toEqual([]);
    });

    it('should only query active items', async () => {
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      await service.findAll();

      for (const call of mockPrisma.setupItem.findMany.mock.calls) {
        expect(call[0].where.isActive).toBe(true);
      }
    });

    it('should order by sortOrder ascending', async () => {
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      await service.findAll();

      for (const call of mockPrisma.setupItem.findMany.mock.calls) {
        expect(call[0].orderBy).toEqual({ sortOrder: 'asc' });
      }
    });
  });

  describe('findByCategory', () => {
    it('should return active items for the given category', async () => {
      const items = [
        mockItem(),
        mockItem({
          id: 'item-2',
          label: 'Ghana',
          value: 'ghana',
          sortOrder: 20,
        }),
      ];
      mockPrisma.setupItem.findMany.mockResolvedValue(items);

      const result = await service.findByCategory('country' as any);

      expect(result).toEqual(items);
      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'country', isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          label: true,
          value: true,
          sortOrder: true,
        },
      });
    });

    it('should include parent info when category is city', async () => {
      const cities = [
        mockItem({ id: 'city-1', label: 'Lagos', value: 'lagos' }),
      ];
      mockPrisma.setupItem.findMany.mockResolvedValue(cities);

      await service.findByCategory('city' as any);

      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'city', isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          label: true,
          value: true,
          sortOrder: true,
          parent: {
            select: { id: true, label: true, value: true },
          },
        },
      });
    });

    it('should return empty array when no items for category', async () => {
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      const result = await service.findByCategory('niche' as any);

      expect(result).toEqual([]);
    });
  });

  describe('findCitiesByCountry', () => {
    it('should return cities for a valid country', async () => {
      const country = mockItem({
        id: 'country-1',
        category: 'country',
        isActive: true,
      });
      const cities = [
        mockItem({
          id: 'city-1',
          label: 'Lagos',
          value: 'lagos',
          sortOrder: 10,
        }),
        mockItem({
          id: 'city-2',
          label: 'Abuja',
          value: 'abuja',
          sortOrder: 20,
        }),
      ];

      mockPrisma.setupItem.findFirst.mockResolvedValue(country);
      mockPrisma.setupItem.findMany.mockResolvedValue(cities);

      const result = await service.findCitiesByCountry('nigeria');

      expect(result).toEqual(cities);
      expect(mockPrisma.setupItem.findFirst).toHaveBeenCalledWith({
        where: { category: 'country', value: 'nigeria', isActive: true },
      });
      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'city', parentId: 'country-1', isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, label: true, value: true, sortOrder: true },
      });
    });

    it('should throw NotFoundException when country not found', async () => {
      mockPrisma.setupItem.findFirst.mockResolvedValue(null);

      await expect(service.findCitiesByCountry('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only return active cities', async () => {
      const country = mockItem({
        id: 'country-1',
        category: 'country',
        isActive: true,
      });
      mockPrisma.setupItem.findFirst.mockResolvedValue(country);
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      await service.findCitiesByCountry('nigeria');

      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('should order cities by sortOrder ascending', async () => {
      const country = mockItem({
        id: 'country-1',
        category: 'country',
        isActive: true,
      });
      mockPrisma.setupItem.findFirst.mockResolvedValue(country);
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      await service.findCitiesByCountry('nigeria');

      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sortOrder: 'asc' },
        }),
      );
    });
  });

  describe('findOrCreateCity', () => {
    const mockCountry = mockItem({
      id: 'country-1',
      category: 'country',
      value: 'nigeria',
      label: 'Nigeria',
      isActive: true,
    });

    it('should create a city when it does not exist', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry) // country lookup
        .mockResolvedValueOnce(null) // existing city check
        .mockResolvedValueOnce({ sortOrder: 50 }); // last city sortOrder
      mockPrisma.setupItem.create.mockResolvedValue({});

      await service.findOrCreateCity('Nigeria', 'Enugu');

      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: {
          category: 'city',
          label: 'Enugu',
          value: 'enugu',
          parentId: 'country-1',
          sortOrder: 60,
        },
      });
    });

    it('should not create when city already exists', async () => {
      const existingCity = mockItem({
        id: 'city-1',
        category: 'city',
        value: 'lagos',
      });

      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry) // country lookup
        .mockResolvedValueOnce(existingCity); // existing city check

      await service.findOrCreateCity('nigeria', 'Lagos');

      expect(mockPrisma.setupItem.create).not.toHaveBeenCalled();
    });

    it('should do nothing when country not found', async () => {
      mockPrisma.setupItem.findFirst.mockResolvedValueOnce(null);

      await service.findOrCreateCity('nonexistent', 'Lagos');

      expect(mockPrisma.setupItem.create).not.toHaveBeenCalled();
    });

    it('should handle country lookup by label (case-insensitive)', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // no existing cities
      mockPrisma.setupItem.create.mockResolvedValue({});

      await service.findOrCreateCity('Nigeria', 'Enugu');

      expect(mockPrisma.setupItem.findFirst).toHaveBeenCalledWith({
        where: {
          category: 'country',
          isActive: true,
          OR: [
            { value: 'nigeria' },
            { label: { equals: 'Nigeria', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should handle P2002 race condition gracefully', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.setupItem.create.mockRejectedValue({ code: 'P2002' });

      // Should not throw
      await expect(
        service.findOrCreateCity('nigeria', 'Lagos'),
      ).resolves.toBeUndefined();
    });

    it('should rethrow non-P2002 errors', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.setupItem.create.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(
        service.findOrCreateCity('nigeria', 'Lagos'),
      ).rejects.toThrow('Connection lost');
    });

    it('should use sortOrder 10 when no existing cities', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry)
        .mockResolvedValueOnce(null) // no existing city
        .mockResolvedValueOnce(null); // no last city
      mockPrisma.setupItem.create.mockResolvedValue({});

      await service.findOrCreateCity('nigeria', 'Enugu');

      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 10 }),
      });
    });

    it('should trim the city label', async () => {
      mockPrisma.setupItem.findFirst
        .mockResolvedValueOnce(mockCountry)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.setupItem.create.mockResolvedValue({});

      await service.findOrCreateCity('nigeria', '  Enugu  ');

      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ label: 'Enugu' }),
      });
    });

    it('should do nothing for empty city label', async () => {
      await service.findOrCreateCity('nigeria', '   ');

      expect(mockPrisma.setupItem.findFirst).not.toHaveBeenCalled();
    });
  });
});
