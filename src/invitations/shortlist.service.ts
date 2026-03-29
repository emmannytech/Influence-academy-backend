import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShortlistService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private async getClientId(supabaseId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  private async verifyCampaignOwnership(campaignId: string, clientId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return campaign;
  }

  async getShortlist(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    await this.verifyCampaignOwnership(campaignId, clientId);

    const entries = await this.prisma.shortlistCreator.findMany({
      where: { campaignId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            country: true,
            city: true,
            niches: true,
            socialHandles: true,
            bio: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return {
      campaignId,
      count: entries.length,
      creators: entries.map((e) => e.creator),
    };
  }

  async updateShortlist(
    campaignId: string,
    creatorIds: string[],
    supabaseId: string,
  ) {
    const clientId = await this.getClientId(supabaseId);
    await this.verifyCampaignOwnership(campaignId, clientId);

    // Verify all creators exist and are approved
    const creators = await this.prisma.creator.findMany({
      where: { id: { in: creatorIds }, status: 'approved' },
      select: { id: true },
    });
    const validIds = new Set(creators.map((c) => c.id));
    const invalid = creatorIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Creators not found or not approved: ${invalid.join(', ')}`,
      );
    }

    // Replace shortlist atomically
    await this.prisma.$transaction([
      this.prisma.shortlistCreator.deleteMany({ where: { campaignId } }),
      ...creatorIds.map((creatorId) =>
        this.prisma.shortlistCreator.create({
          data: { campaignId, creatorId },
        }),
      ),
    ]);

    return this.getShortlist(campaignId, supabaseId);
  }

  async createShareLink(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    await this.verifyCampaignOwnership(campaignId, clientId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const link = await this.prisma.shareLink.create({
      data: { campaignId, expiresAt },
    });

    const baseUrl =
      this.config.get<string>('APP_BASE_URL') || 'http://localhost:3001';

    return {
      token: link.token,
      url: `${baseUrl}/shortlist/review/${link.token}`,
      expiresAt: link.expiresAt,
    };
  }

  async getLatestShareLink(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    await this.verifyCampaignOwnership(campaignId, clientId);

    const link = await this.prisma.shareLink.findFirst({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    if (!link) throw new NotFoundException('No share link found');

    return {
      token: link.token,
      expiresAt: link.expiresAt,
      decisions: link.decisions,
      isExpired: link.expiresAt < new Date(),
    };
  }

  async getShortlistByToken(token: string) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            shortlistedCreators: {
              include: {
                creator: {
                  select: {
                    id: true,
                    fullName: true,
                    country: true,
                    city: true,
                    niches: true,
                    bio: true,
                    socialHandles: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!link) throw new NotFoundException('Share link not found');
    if (link.expiresAt < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    return {
      campaignTitle: link.campaign.title,
      creators: link.campaign.shortlistedCreators.map((sc) => sc.creator),
      decisions: link.decisions ?? {},
    };
  }

  async submitDecision(
    token: string,
    creatorId: string,
    decision: 'approved' | 'rejected',
  ) {
    const link = await this.prisma.shareLink.findUnique({
      where: { token },
    });
    if (!link) throw new NotFoundException('Share link not found');
    if (link.expiresAt < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    // Verify creator is on the shortlist
    const onShortlist = await this.prisma.shortlistCreator.findUnique({
      where: {
        campaignId_creatorId: {
          campaignId: link.campaignId,
          creatorId,
        },
      },
    });
    if (!onShortlist) {
      throw new BadRequestException('Creator is not on the shortlist');
    }

    const existing = (link.decisions as Record<string, any>) ?? {};
    existing[creatorId] = {
      decision,
      decidedAt: new Date().toISOString(),
    };

    await this.prisma.shareLink.update({
      where: { id: link.id },
      data: { decisions: existing },
    });

    return { creatorId, decision };
  }
}
