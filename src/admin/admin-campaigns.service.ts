import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { isValidCampaignTransition } from '../common/utils/campaign-transitions';
import { AdminCampaignQueryDto } from './dto/admin-campaign-query.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { BulkCampaignStatusDto } from './dto/bulk-campaign-status.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { NotificationEvents } from '../notifications/notification-events';
import { StorageService } from '../uploads/storage.service';

@Injectable()
export class AdminCampaignsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private storage: StorageService,
  ) {}

  async findAll(query: AdminCampaignQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      search,
      status,
      clientId,
      platform,
    } = query;

    const where: Prisma.CampaignWhereInput = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (platform) where.platforms = { has: platform };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CampaignOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: {
            select: { companyName: true, companyType: true },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        client: {
          select: { id: true, companyName: true, companyType: true },
        },
        statusLogs: { orderBy: { createdAt: 'asc' } },
        assets: { orderBy: { uploadedAt: 'asc' } },
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return {
      ...campaign,
      assets: campaign.assets.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        url: this.storage.getPublicUrl('campaigns', a.storagePath),
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uploadedAt: a.uploadedAt.toISOString(),
      })),
    };
  }

  async updateStatus(
    campaignId: string,
    dto: UpdateCampaignStatusDto,
    changedById?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        client: {
          select: {
            userId: true,
            companyName: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (!isValidCampaignTransition(campaign.status, dto.toStatus)) {
      throw new BadRequestException(
        `Invalid transition from '${campaign.status}' to '${dto.toStatus}'`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: dto.toStatus },
      }),
      this.prisma.campaignStatusLog.create({
        data: {
          campaignId,
          fromStatus: campaign.status,
          toStatus: dto.toStatus,
          note: dto.note,
          changedById,
        },
      }),
    ]);

    this.eventEmitter.emit(NotificationEvents.CAMPAIGN_STATUS_CHANGED, {
      campaignId,
      campaignTitle: campaign.title,
      clientUserId: campaign.client.user.id,
      clientEmail: campaign.client.user.email,
      fromStatus: campaign.status,
      toStatus: dto.toStatus,
      note: dto.note,
    });

    return updated;
  }

  async bulkUpdateStatus(dto: BulkCampaignStatusDto, changedById?: string) {
    const results: { campaignId: string; success: boolean; error?: string }[] =
      [];

    for (const campaignId of dto.campaignIds) {
      try {
        await this.updateStatus(
          campaignId,
          { toStatus: dto.toStatus, note: dto.note },
          changedById,
        );
        results.push({ campaignId, success: true });
      } catch (err) {
        results.push({
          campaignId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async updateInternalNotes(campaignId: string, notes: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { adminNotes: notes },
    });
  }

  async exportCsv(query: AdminCampaignQueryDto): Promise<string> {
    const { search, status, clientId, platform } = query;

    const where: Prisma.CampaignWhereInput = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (platform) where.platforms = { has: platform };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const campaigns = await this.prisma.campaign.findMany({
      where,
      include: {
        client: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID',
      'Title',
      'Client',
      'Status',
      'Platforms',
      'Budget',
      'Creators Needed',
      'Created At',
    ];

    const rows = campaigns.map((c) => [
      c.id,
      c.title,
      c.client.companyName ?? '',
      c.status,
      c.platforms.join('; '),
      c.budget?.toString() ?? '',
      c.numberOfCreators?.toString() ?? '',
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
