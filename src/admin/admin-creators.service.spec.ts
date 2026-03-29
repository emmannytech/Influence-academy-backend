import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminCreatorsService } from './admin-creators.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  creator: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

const mockEventEmitter = { emit: jest.fn() };

describe('AdminCreatorsService', () => {
  let service: AdminCreatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCreatorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AdminCreatorsService>(AdminCreatorsService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return creator details', async () => {
      const creator = {
        id: 'cr-1',
        fullName: 'John',
        status: 'submitted',
        user: {
          email: 'john@test.com',
          isVerified: true,
          createdAt: new Date(),
        },
      };
      mockPrisma.creator.findUnique.mockResolvedValue(creator);

      const result = await service.findOne('cr-1');
      expect(result.fullName).toBe('John');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and emit event', async () => {
      const creator = {
        id: 'cr-1',
        fullName: 'John',
        user: { id: 'user-1', email: 'john@test.com' },
      };
      mockPrisma.creator.findUnique.mockResolvedValue(creator);
      mockPrisma.creator.update.mockResolvedValue({
        ...creator,
        status: 'approved',
      });

      const result = await service.updateStatus('cr-1', {
        status: 'approved' as any,
      });

      expect(result.status).toBe('approved');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'creator.status.changed',
        expect.objectContaining({ newStatus: 'approved' }),
      );
    });

    it('should require reason when rejecting', async () => {
      const creator = {
        id: 'cr-1',
        user: { id: 'user-1', email: 'john@test.com' },
      };
      mockPrisma.creator.findUnique.mockResolvedValue(creator);

      await expect(
        service.updateStatus('cr-1', { status: 'rejected' as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for missing creator', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('unknown', { status: 'approved' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.creator.findMany.mockResolvedValue([
        { id: 'cr-1', fullName: 'John' },
      ]);
      mockPrisma.creator.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
