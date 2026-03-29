import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      totalCreators,
      pendingCreatorReviews,
      totalClients,
      activeCampaigns,
      campaignsPendingReview,
    ] = await Promise.all([
      this.prisma.creator.count(),
      this.prisma.creator.count({
        where: { status: { in: ['submitted', 'under_review'] } },
      }),
      this.prisma.client.count(),
      this.prisma.campaign.count({ where: { status: 'active' } }),
      this.prisma.campaign.count({
        where: { status: 'submitted' },
      }),
    ]);

    return {
      totalCreators,
      pendingCreatorReviews,
      totalClients,
      activeCampaigns,
      campaignsPendingReview,
    };
  }

  async getActivity(limit = 20) {
    // Combine recent campaign status changes + recent user registrations
    const [statusLogs, recentUsers] = await Promise.all([
      this.prisma.campaignStatusLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { title: true } },
        },
      }),
      this.prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const activities = [
      ...statusLogs.map((log) => ({
        type: 'campaign_status_change' as const,
        description: `Campaign "${log.campaign.title}" moved to ${log.toStatus}`,
        note: log.note,
        createdAt: log.createdAt,
      })),
      ...recentUsers.map((user) => ({
        type: 'user_registration' as const,
        description: `New ${user.role} registered: ${user.email}`,
        note: null,
        createdAt: user.createdAt,
      })),
    ];

    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activities.slice(0, limit);
  }

  async getUsers(limit = 50) {
    const [creators, clients] = await Promise.all([
      this.prisma.creator.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, email: true, isVerified: true } },
        },
      }),
      this.prisma.client.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          companyType: true,
          createdAt: true,
          user: { select: { id: true, email: true, isVerified: true } },
        },
      }),
    ]);

    return {
      creators,
      clients,
    };
  }
}
