import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CampaignStatus, Prisma } from '@prisma/client';
import { isValidCampaignTransition } from '../common/utils/campaign-transitions';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { NotificationEvents } from '../notifications/notification-events';

const CAMPAIGN_PUBLIC_SELECT = {
  id: true,
  clientId: true,
  title: true,
  description: true,
  platforms: true,
  requirements: true,
  numberOfCreators: true,
  timeline: true,
  budget: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async getClientId(supabaseId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client profile not found');
    }
    return client.id;
  }

  private async getCampaignWithOwnershipCheck(
    campaignId: string,
    clientId: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return campaign;
  }

  async findAllByClient(supabaseId: string, query: CampaignQueryDto) {
    const clientId = await this.getClientId(supabaseId);
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      status,
      search,
    } = query;

    const where: Prisma.CampaignWhereInput = { clientId };
    if (status) where.status = status;
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
        select: {
          id: true,
          title: true,
          status: true,
          platforms: true,
          numberOfCreators: true,
          budget: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async create(supabaseId: string, dto: CreateCampaignDto) {
    const clientId = await this.getClientId(supabaseId);

    const campaign = await this.prisma.campaign.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        platforms: dto.platforms ?? [],
        requirements: dto.requirements ? { ...dto.requirements } : undefined,
        numberOfCreators: dto.numberOfCreators,
        timeline: dto.timeline ? { ...dto.timeline } : undefined,
        budget: dto.budget,
      },
    });

    // Log initial status
    await this.prisma.campaignStatusLog.create({
      data: {
        campaignId: campaign.id,
        fromStatus: null,
        toStatus: CampaignStatus.draft,
        note: 'Campaign created',
      },
    });

    return campaign;
  }

  async findOne(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    await this.getCampaignWithOwnershipCheck(campaignId, clientId);

    return this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: CAMPAIGN_PUBLIC_SELECT,
    });
  }

  async update(campaignId: string, supabaseId: string, dto: UpdateCampaignDto) {
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.getCampaignWithOwnershipCheck(
      campaignId,
      clientId,
    );

    if (
      campaign.status !== CampaignStatus.draft &&
      campaign.status !== CampaignStatus.rejected
    ) {
      throw new BadRequestException(
        'Campaign can only be edited in draft or rejected status',
      );
    }

    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...dto,
        requirements: dto.requirements ? { ...dto.requirements } : undefined,
        timeline: dto.timeline ? { ...dto.timeline } : undefined,
        platforms: dto.platforms ?? undefined,
      },
      select: CAMPAIGN_PUBLIC_SELECT,
    });
  }

  async submit(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.getCampaignWithOwnershipCheck(
      campaignId,
      clientId,
    );

    if (!isValidCampaignTransition(campaign.status, CampaignStatus.submitted)) {
      throw new BadRequestException(
        `Cannot submit campaign from '${campaign.status}' status`,
      );
    }

    // Validate required fields
    const missing: string[] = [];
    if (!campaign.title) missing.push('title');
    if (!campaign.description) missing.push('description');
    if (!campaign.platforms || campaign.platforms.length === 0)
      missing.push('platforms');
    if (!campaign.numberOfCreators) missing.push('numberOfCreators');
    if (!campaign.timeline) missing.push('timeline');

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Missing required fields for submission',
        details: { missingFields: missing },
      });
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.submitted },
        select: CAMPAIGN_PUBLIC_SELECT,
      }),
      this.prisma.campaignStatusLog.create({
        data: {
          campaignId,
          fromStatus: campaign.status,
          toStatus: CampaignStatus.submitted,
          note: 'Campaign submitted for review',
        },
      }),
    ]);

    // Fetch client name for notification
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { companyName: true },
    });

    this.eventEmitter.emit(NotificationEvents.CAMPAIGN_SUBMITTED, {
      campaignId,
      campaignTitle: campaign.title,
      clientName: client?.companyName ?? 'Unknown',
    });

    return updated;
  }

  async getStatusLogs(campaignId: string, supabaseId: string, role: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Admins can view any campaign's logs; clients can only view their own
    if (role !== 'admin') {
      const clientId = await this.getClientId(supabaseId);
      if (campaign.clientId !== clientId) {
        throw new ForbiddenException('You do not own this campaign');
      }
    }

    return this.prisma.campaignStatusLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
