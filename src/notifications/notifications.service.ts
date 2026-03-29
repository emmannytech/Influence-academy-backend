import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

export interface CreateNotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private async resolveUserId(supabaseId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.id;
  }

  async findAll(supabaseId: string, query: NotificationQueryDto) {
    const userId = await this.resolveUserId(supabaseId);
    const { page = 1, pageSize = 20, type, isRead } = query;

    const where: Prisma.NotificationWhereInput = { userId };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async markAsRead(supabaseId: string, notificationId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(supabaseId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { markedAsRead: count };
  }

  async remove(supabaseId: string, notificationId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
    return { deleted: true };
  }

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type ?? 'info',
        title: input.title,
        message: input.message,
        metadata: input.metadata ?? undefined,
      },
    });
  }
}
