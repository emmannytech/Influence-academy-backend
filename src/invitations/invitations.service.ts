import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { CampaignStatus, InvitationStatus } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async getClientId(supabaseId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  private async getCreatorId(supabaseId: string): Promise<string> {
    const creator = await this.prisma.creator.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');
    return creator.id;
  }

  async sendInvitations(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        client: {
          select: {
            user: { select: { id: true, email: true } },
            companyName: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    // Only allow sending invitations when campaign is active
    if (campaign.status !== CampaignStatus.active) {
      throw new BadRequestException(
        `Cannot send invitations when campaign is in '${campaign.status}' status`,
      );
    }

    // Get shortlisted creators who don't already have invitations
    const shortlisted = await this.prisma.shortlistCreator.findMany({
      where: { campaignId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (shortlisted.length === 0) {
      throw new BadRequestException('No creators on shortlist to invite');
    }

    const existingInvitations = await this.prisma.invitation.findMany({
      where: { campaignId },
      select: { creatorId: true },
    });
    const alreadyInvited = new Set(existingInvitations.map((i) => i.creatorId));

    const toInvite = shortlisted.filter(
      (s) => !alreadyInvited.has(s.creatorId),
    );
    if (toInvite.length === 0) {
      throw new BadRequestException('All shortlisted creators already invited');
    }

    // Create invitation records
    await this.prisma.invitation.createMany({
      data: toInvite.map((s) => ({
        campaignId,
        creatorId: s.creatorId,
      })),
    });

    // Emit notifications for each invited creator
    for (const entry of toInvite) {
      this.eventEmitter.emit('invitation.sent', {
        creatorUserId: entry.creator.user.id,
        creatorEmail: entry.creator.user.email,
        creatorName: entry.creator.fullName ?? 'Creator',
        campaignTitle: campaign.title,
        campaignId,
        clientName: campaign.client.companyName ?? 'A client',
      });
    }

    return {
      invited: toInvite.length,
      alreadyInvited: alreadyInvited.size,
    };
  }

  async getCreatorInvitations(supabaseId: string) {
    const creatorId = await this.getCreatorId(supabaseId);

    return this.prisma.invitation.findMany({
      where: { creatorId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            platforms: true,
            budget: true,
            status: true,
            client: { select: { companyName: true, companyType: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  async respondToInvitation(
    invitationId: string,
    action: 'accept' | 'decline',
    supabaseId: string,
  ) {
    const creatorId = await this.getCreatorId(supabaseId);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
            client: {
              select: { user: { select: { id: true } }, companyName: true },
            },
          },
        },
      },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.creatorId !== creatorId) {
      throw new ForbiddenException('This invitation is not yours');
    }
    if (invitation.status !== InvitationStatus.pending) {
      throw new BadRequestException(`Invitation already ${invitation.status}`);
    }

    const newStatus =
      action === 'accept'
        ? InvitationStatus.accepted
        : InvitationStatus.declined;

    const updated = await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: newStatus, respondedAt: new Date() },
    });

    // Notify client (outside transaction — side effect)
    this.eventEmitter.emit('invitation.responded', {
      clientUserId: invitation.campaign.client.user.id,
      campaignTitle: invitation.campaign.title,
      campaignId: invitation.campaign.id,
      creatorId,
      action,
    });

    return updated;
  }

  async getCampaignInvitations(campaignId: string, supabaseId: string) {
    const clientId = await this.getClientId(supabaseId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    const invitations = await this.prisma.invitation.findMany({
      where: { campaignId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            country: true,
            niches: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    const counts = {
      total: invitations.length,
      pending: invitations.filter((i) => i.status === 'pending').length,
      accepted: invitations.filter((i) => i.status === 'accepted').length,
      declined: invitations.filter((i) => i.status === 'declined').length,
    };

    return { invitations, counts };
  }
}
