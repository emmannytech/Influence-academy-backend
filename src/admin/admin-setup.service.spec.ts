import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AdminSetupService } from './admin-setup.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  setupItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockItem = (overrides = {}) => ({
  id: 'item-1',
  category: 'country',
  label: 'Nigeria',
  value: 'nigeria',
  isActive: true,
  sortOrder: 10,
  parentId: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('AdminSetupService', () => {
  let service: AdminSetupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSetupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminSetupService>(AdminSetupService);
    jest.clearAllMocks();
  });

  describe('findByCategory', () => {
    it('should return all items including inactive', async () => {
      const items = [mockItem(), mockItem({ id: 'item-2', isActive: false })];
      mockPrisma.setupItem.findMany.mockResolvedValue(items);

      const result = await service.findByCategory('country' as any);

      expect(result).toEqual(items);
      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'country' },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { children: true } } },
      });
    });

    it('should include parent info when category is city', async () => {
      const cities = [
        mockItem({ id: 'city-1', category: 'city', label: 'Lagos' }),
      ];
      mockPrisma.setupItem.findMany.mockResolvedValue(cities);

      await service.findByCategory('city' as any);

      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'city' },
        orderBy: { sortOrder: 'asc' },
        include: {
          parent: { select: { id: true, label: true, value: true } },
        },
      });
    });

    it('should return plain items for other categories', async () => {
      mockPrisma.setupItem.findMany.mockResolvedValue([]);

      await service.findByCategory('niche' as any);

      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { category: 'niche' },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a setup item with provided value', async () => {
      const created = mockItem();
      mockPrisma.setupItem.create.mockResolvedValue(created);

      const result = await service.create('country' as any, {
        label: 'Nigeria',
        value: 'nigeria',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: {
          category: 'country',
          label: 'Nigeria',
          value: 'nigeria',
          isActive: true,
          sortOrder: 0,
          parentId: null,
        },
      });
    });

    it('should auto-generate value slug from label when value not provided', async () => {
      const created = mockItem({
        label: 'South Africa',
        value: 'south-africa',
      });
      mockPrisma.setupItem.create.mockResolvedValue(created);

      await service.create('country' as any, { label: 'South Africa' });

      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ value: 'south-africa' }),
      });
    });

    it('should throw ConflictException on duplicate value', async () => {
      mockPrisma.setupItem.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create('country' as any, {
          label: 'Nigeria',
          value: 'nigeria',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-P2002 errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.setupItem.create.mockRejectedValue(error);

      await expect(
        service.create('country' as any, { label: 'Nigeria' }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should require parentId when creating a city', async () => {
      await expect(
        service.create('city' as any, { label: 'Lagos' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate parentId references a country', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(
        mockItem({ id: 'niche-1', category: 'niche' }),
      );

      await expect(
        service.create('city' as any, {
          label: 'Lagos',
          parentId: 'niche-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate parentId exists', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(null);

      await expect(
        service.create('city' as any, {
          label: 'Lagos',
          parentId: 'nonexistent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a city with valid parentId', async () => {
      const parent = mockItem({ id: 'country-1', category: 'country' });
      const created = mockItem({
        id: 'city-1',
        category: 'city',
        label: 'Lagos',
        value: 'lagos',
        parentId: 'country-1',
      });

      mockPrisma.setupItem.findUnique.mockResolvedValue(parent);
      mockPrisma.setupItem.create.mockResolvedValue(created);

      const result = await service.create('city' as any, {
        label: 'Lagos',
        parentId: 'country-1',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.setupItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'city',
          parentId: 'country-1',
        }),
      });
    });

    it('should reject parentId on non-city categories', async () => {
      await expect(
        service.create('niche' as any, {
          label: 'Fashion',
          parentId: 'some-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject parentId on country category', async () => {
      await expect(
        service.create('country' as any, {
          label: 'Nigeria',
          parentId: 'some-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an existing item', async () => {
      const existing = mockItem();
      const updated = mockItem({ label: 'Nigeria Updated' });
      mockPrisma.setupItem.findUnique.mockResolvedValue(existing);
      mockPrisma.setupItem.update.mockResolvedValue(updated);

      const result = await service.update('item-1', {
        label: 'Nigeria Updated',
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.setupItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { label: 'Nigeria Updated' },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { label: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate value', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(mockItem());
      mockPrisma.setupItem.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('item-1', { value: 'existing-value' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject parentId on non-city items', async () => {
      const existing = mockItem({ category: 'niche' });
      mockPrisma.setupItem.findUnique.mockResolvedValue(existing);

      await expect(
        service.update('item-1', { parentId: 'some-id' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject parentId pointing to a non-country', async () => {
      const existing = mockItem({ category: 'city', parentId: 'country-1' });
      const nonCountry = mockItem({ id: 'niche-1', category: 'niche' });
      mockPrisma.setupItem.findUnique
        .mockResolvedValueOnce(existing) // item lookup
        .mockResolvedValueOnce(nonCountry); // parent lookup

      await expect(
        service.update('item-1', { parentId: 'niche-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow parentId change on city items to a valid country', async () => {
      const existing = mockItem({ category: 'city', parentId: 'country-1' });
      const newParent = mockItem({ id: 'country-2', category: 'country' });
      const updated = mockItem({
        category: 'city',
        parentId: 'country-2',
      });
      mockPrisma.setupItem.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(newParent);
      mockPrisma.setupItem.update.mockResolvedValue(updated);

      const result = await service.update('item-1', {
        parentId: 'country-2',
      });

      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting isActive to false', async () => {
      const existing = mockItem({ category: 'niche' });
      const deactivated = mockItem({ category: 'niche', isActive: false });
      mockPrisma.setupItem.findUnique.mockResolvedValue(existing);
      mockPrisma.setupItem.update.mockResolvedValue(deactivated);

      const result = await service.remove('item-1');

      expect(result).toEqual(deactivated);
      expect(mockPrisma.setupItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cascade soft-delete child cities when removing a country', async () => {
      const country = mockItem({ id: 'country-1', category: 'country' });
      const deactivated = { ...country, isActive: false };
      mockPrisma.setupItem.findUnique.mockResolvedValue(country);
      mockPrisma.setupItem.update.mockReturnValue(deactivated);
      mockPrisma.setupItem.updateMany.mockReturnValue({ count: 5 });
      mockPrisma.$transaction.mockResolvedValue([deactivated, { count: 5 }]);

      const result = await service.remove('country-1');

      // Should return just the deactivated country, not the transaction array
      expect(result).toEqual(deactivated);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.setupItem.update).toHaveBeenCalledWith({
        where: { id: 'country-1' },
        data: { isActive: false },
      });
      expect(mockPrisma.setupItem.updateMany).toHaveBeenCalledWith({
        where: { parentId: 'country-1' },
        data: { isActive: false },
      });
    });
  });

  describe('reorder', () => {
    it('should update sort orders in a transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.reorder('country' as any, {
        items: [
          { id: 'item-1', sortOrder: 20 },
          { id: 'item-2', sortOrder: 10 },
        ],
      });

      expect(result).toEqual({ message: 'Items reordered successfully' });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
      ]);
    });
  });

  describe('findCitiesByCountry', () => {
    it('should return cities for a valid country', async () => {
      const country = mockItem({ id: 'country-1', category: 'country' });
      const cities = [
        mockItem({ id: 'city-1', category: 'city', label: 'Lagos' }),
      ];
      mockPrisma.setupItem.findUnique.mockResolvedValue(country);
      mockPrisma.setupItem.findMany.mockResolvedValue(cities);

      const result = await service.findCitiesByCountry('country-1');

      expect(result).toEqual(cities);
      expect(mockPrisma.setupItem.findMany).toHaveBeenCalledWith({
        where: { parentId: 'country-1', category: 'city' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should throw NotFoundException when country not found', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(null);

      await expect(service.findCitiesByCountry('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when id is not a country', async () => {
      mockPrisma.setupItem.findUnique.mockResolvedValue(
        mockItem({ category: 'niche' }),
      );

      await expect(service.findCitiesByCountry('niche-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
