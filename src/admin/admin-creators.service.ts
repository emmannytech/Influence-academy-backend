import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CreatorStatus, Prisma } from '@prisma/client';
import { AdminCreatorQueryDto } from './dto/admin-creator-query.dto';
import { UpdateCreatorStatusDto } from './dto/update-creator-status.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { NotificationEvents } from '../notifications/notification-events';

@Injectable()
export class AdminCreatorsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: AdminCreatorQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      search,
      status,
      country,
      niche,
    } = query;

    const where: Prisma.CreatorWhereInput = {};
    if (status) where.status = status;
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (niche) where.niches = { has: niche };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CreatorOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true, isVerified: true } } },
      }),
      this.prisma.creator.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        user: { select: { email: true, isVerified: true, createdAt: true } },
      },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    return creator;
  }

  async updateStatus(creatorId: string, dto: UpdateCreatorStatusDto) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (dto.status === CreatorStatus.rejected && !dto.reason) {
      throw new BadRequestException(
        'Reason is required when rejecting a creator',
      );
    }

    const updated = await this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === CreatorStatus.rejected ? dto.reason : null,
      },
    });

    this.eventEmitter.emit(NotificationEvents.CREATOR_STATUS_CHANGED, {
      creatorId,
      userId: creator.user.id,
      email: creator.user.email,
      creatorName: creator.fullName ?? '',
      newStatus: dto.status,
      reason: dto.reason,
    });

    return updated;
  }

  async updateInternalNotes(creatorId: string, notes: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return this.prisma.creator.update({
      where: { id: creatorId },
      data: { adminNotes: notes },
    });
  }

  async exportCsv(query: AdminCreatorQueryDto): Promise<string> {
    const { search, status, country, niche } = query;

    const where: Prisma.CreatorWhereInput = {};
    if (status) where.status = status;
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (niche) where.niches = { has: niche };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const creators = await this.prisma.creator.findMany({
      where,
      include: { user: { select: { email: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Country',
      'City',
      'Status',
      'Niches',
      'Verified',
      'Submitted At',
      'Created At',
    ];

    const rows = creators.map((c) => [
      c.id,
      c.fullName ?? '',
      c.email ?? c.user.email,
      c.country ?? '',
      c.city ?? '',
      c.status,
      c.niches.join('; '),
      c.user.isVerified ? 'Yes' : 'No',
      c.submittedAt?.toISOString() ?? '',
      c.createdAt.toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');
  }
}
