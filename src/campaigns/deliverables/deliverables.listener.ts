import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../notifications/email.service';
import { NotificationEvents } from '../../notifications/notification-events';
import type {
  PostReviewedPayload,
  PostSubmittedPayload,
  MetricOverrideSubmittedPayload,
  MetricOverrideReviewedPayload,
} from '../../notifications/notification-events';

@Injectable()
export class DeliverablesListener {
  private readonly logger = new Logger(DeliverablesListener.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private email: EmailService,
  ) {}

  @OnEvent(NotificationEvents.POST_SUBMITTED)
  async handlePostSubmitted(payload: PostSubmittedPayload) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: payload.campaignId },
        include: {
          client: { select: { user: { select: { id: true, email: true } } } },
        },
      });
      if (!campaign?.client?.user) return;

      const creator = await this.prisma.creator.findUnique({
        where: { id: payload.creatorId },
        select: { fullName: true },
      });
      const creatorName = creator?.fullName ?? 'A creator';

      await this.notifications.create({
        userId: campaign.client.user.id,
        type: 'info',
        title: 'New post submitted',
        message: `${creatorName} submitted a post for "${payload.campaignTitle}".`,
        metadata: { campaignId: payload.campaignId, submissionId: payload.submissionId },
      });
      await this.email.send({
        to: campaign.client.user.email,
        subject: `Influence Academy — New post submitted`,
        html: `<p>${creatorName} submitted a post for your campaign <strong>"${payload.campaignTitle}"</strong>. Log in to review.</p>`,
      });
    } catch (err) {
      this.logger.error(
        `post.submitted handler failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent(NotificationEvents.POST_REVIEWED)
  async handlePostReviewed(payload: PostReviewedPayload) {
    try {
      const creator = await this.prisma.creator.findUnique({
        where: { id: payload.creatorId },
        include: { user: { select: { id: true, email: true } } },
      });
      if (!creator?.user) return;

      const verb = payload.status === 'approved' ? 'approved' : 'rejected';
      const msg = payload.note
        ? `Your post for "${payload.campaignTitle}" was ${verb}. Note: ${payload.note}`
        : `Your post for "${payload.campaignTitle}" was ${verb}.`;

      await this.notifications.create({
        userId: creator.user.id,
        type: payload.status === 'approved' ? 'success' : 'warning',
        title: `Post ${verb}`,
        message: msg,
        metadata: { campaignId: payload.campaignId, submissionId: payload.submissionId },
      });
      await this.email.send({
        to: creator.user.email,
        subject: `Influence Academy — Post ${verb}`,
        html: `<p>${msg}</p>`,
      });

      if (payload.status === 'approved') {
        await this.maybeFireCompleteEvent(payload.campaignId);
      }
    } catch (err) {
      this.logger.error(
        `post.reviewed handler failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent(NotificationEvents.METRIC_OVERRIDE_SUBMITTED)
  async handleOverrideSubmitted(payload: MetricOverrideSubmittedPayload) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: payload.campaignId },
        include: { client: { select: { user: { select: { id: true } } } } },
      });
      if (!campaign?.client?.user) return;
      await this.notifications.create({
        userId: campaign.client.user.id,
        type: 'info',
        title: 'Off-platform metrics submitted',
        message: 'A creator submitted off-platform metrics for your campaign.',
        metadata: { campaignId: payload.campaignId, overrideId: payload.overrideId },
      });
    } catch (err) {
      this.logger.error(
        `override.submitted handler failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent(NotificationEvents.METRIC_OVERRIDE_REVIEWED)
  async handleOverrideReviewed(payload: MetricOverrideReviewedPayload) {
    try {
      const creator = await this.prisma.creator.findUnique({
        where: { id: payload.creatorId },
        select: { user: { select: { id: true } } },
      });
      if (!creator?.user) return;
      const verb = payload.status === 'approved' ? 'approved' : 'rejected';
      await this.notifications.create({
        userId: creator.user.id,
        type: payload.status === 'approved' ? 'success' : 'warning',
        title: `Metric override ${verb}`,
        message: `Your off-platform metric submission was ${verb}.`,
        metadata: { campaignId: payload.campaignId, overrideId: payload.overrideId },
      });
      if (payload.status === 'approved') {
        await this.maybeFireCompleteEvent(payload.campaignId);
      }
    } catch (err) {
      this.logger.error(
        `override.reviewed handler failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async maybeFireCompleteEvent(campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        client: { select: { user: { select: { id: true } } } },
      },
    });
    if (!campaign?.client?.user) return;

    const [targets, invitations, posts, overrides] = await Promise.all([
      this.prisma.campaignKpi.findMany({ where: { campaignId } }),
      this.prisma.invitation.findMany({
        where: { campaignId, status: 'accepted' },
        select: { creatorId: true },
      }),
      this.prisma.campaignPostSubmission.findMany({
        where: { campaignId, status: 'approved' },
      }),
      this.prisma.campaignMetricOverride.findMany({
        where: { campaignId, status: 'approved' },
      }),
    ]);

    if (targets.length === 0 || invitations.length === 0) return;

    const allDone = invitations.every((inv) =>
      targets.every((t) => {
        if (t.type === 'posts') {
          return posts.filter((p) => p.creatorId === inv.creatorId).length >= t.targetValue;
        }
        const sum = posts
          .filter((p) => p.creatorId === inv.creatorId)
          .reduce((acc, p) => acc + (((p as unknown as Record<string, number | null>)[t.type] ?? 0) as number), 0);
        const ov = overrides.find((o) => o.creatorId === inv.creatorId && o.type === t.type);
        return sum + (ov?.reportedValue ?? 0) >= t.targetValue;
      }),
    );
    if (!allDone) return;

    // Idempotency: skip if we've already fired for this campaign
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: campaign.client.user.id,
        title: 'All deliverables complete',
        metadata: { path: ['campaignId'], equals: campaignId },
      },
    });
    if (existing) return;

    await this.notifications.create({
      userId: campaign.client.user.id,
      type: 'success',
      title: 'All deliverables complete',
      message: `Every creator has hit their targets on "${campaign.title}".`,
      metadata: { campaignId },
    });
  }
}
