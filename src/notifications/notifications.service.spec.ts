import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const userId = 'internal-user-id';
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'n1', title: 'Test', isRead: false },
      ]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll('supabase-id', {});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { supabaseId: 'supabase-id' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findAll('unknown', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const userId = 'internal-user-id';
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'n1',
        userId,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        isRead: true,
      });

      const result = await service.markAsRead('supabase-id', 'n1');
      expect(result.isRead).toBe(true);
    });

    it('should throw if notification not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('supabase-id', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should return count of updated notifications', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('supabase-id');
      expect(result).toEqual({ markedAsRead: 5 });
    });
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const input = {
        userId: 'user-id',
        title: 'Test',
        message: 'Test message',
      };
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n1',
        ...input,
        type: 'info',
        isRead: false,
      });

      const result = await service.create(input);
      expect(result.title).toBe('Test');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });
  });
});
