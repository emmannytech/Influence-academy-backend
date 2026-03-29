import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationEvents } from './notification-events';
import type {
  CreatorStatusChangedPayload,
  CampaignStatusChangedPayload,
  CampaignSubmittedPayload,
} from './notification-events';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  @OnEvent(NotificationEvents.CREATOR_STATUS_CHANGED)
  async handleCreatorStatusChanged(payload: CreatorStatusChangedPayload) {
    try {
      const { userId, email, creatorName, newStatus, reason } = payload;

      const titleMap: Record<string, string> = {
        under_review: 'Profile Under Review',
        approved: 'Profile Approved',
        rejected: 'Profile Rejected',
      };

      const messageMap: Record<string, string> = {
        under_review: 'Your profile is now being reviewed by our team.',
        approved:
          'Congratulations! Your profile has been approved. You can now receive campaign invitations.',
        rejected: `Your profile has been rejected.${reason ? ` Reason: ${reason}` : ''} You can edit and resubmit.`,
      };

      const title = titleMap[newStatus] || `Profile Status: ${newStatus}`;
      const message =
        messageMap[newStatus] || `Your profile status changed to ${newStatus}.`;
      const type =
        newStatus === 'approved'
          ? 'success'
          : newStatus === 'rejected'
            ? 'warning'
            : 'info';

      // In-app notification
      await this.notificationsService.create({
        userId,
        type: type as any,
        title,
        message,
        metadata: { creatorId: payload.creatorId, newStatus },
      });

      // Email notification
      await this.emailService.send({
        to: email,
        subject: `Influence Academy — ${title}`,
        html: `
          <h2>${title}</h2>
          <p>Hi ${creatorName || 'Creator'},</p>
          <p>${message}</p>
          <p>— The Influence Academy Team</p>
        `,
      });

      this.logger.log(
        `Creator status notification sent to ${email} (${newStatus})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle creator status changed event: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent(NotificationEvents.CAMPAIGN_STATUS_CHANGED)
  async handleCampaignStatusChanged(payload: CampaignStatusChangedPayload) {
    try {
      const { clientUserId, clientEmail, campaignTitle, toStatus, note } =
        payload;

      const title = `Campaign "${campaignTitle}" — ${toStatus.replace(/_/g, ' ')}`;
      const message = `Your campaign "${campaignTitle}" status changed to ${toStatus.replace(/_/g, ' ')}.${note ? ` Note: ${note}` : ''}`;
      const type =
        toStatus === 'active'
          ? 'success'
          : toStatus === 'rejected'
            ? 'warning'
            : 'info';

      // In-app notification
      await this.notificationsService.create({
        userId: clientUserId,
        type: type as any,
        title,
        message,
        metadata: {
          campaignId: payload.campaignId,
          fromStatus: payload.fromStatus,
          toStatus,
        },
      });

      // Email notification
      await this.emailService.send({
        to: clientEmail,
        subject: `Influence Academy — ${title}`,
        html: `
          <h2>Campaign Status Update</h2>
          <p>Your campaign <strong>"${campaignTitle}"</strong> has been moved to <strong>${toStatus.replace(/_/g, ' ')}</strong>.</p>
          ${note ? `<p><em>Note: ${note}</em></p>` : ''}
          <p>— The Influence Academy Team</p>
        `,
      });

      this.logger.log(
        `Campaign status notification sent to ${clientEmail} (${toStatus})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle campaign status changed event: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent(NotificationEvents.CAMPAIGN_SUBMITTED)
  async handleCampaignSubmitted(payload: CampaignSubmittedPayload) {
    try {
      // Notify all admin users
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          type: 'info',
          title: 'New Campaign Submitted',
          message: `Campaign "${payload.campaignTitle}" was submitted by ${payload.clientName} and needs review.`,
          metadata: { campaignId: payload.campaignId },
        });
      }

      this.logger.log(
        `Campaign submitted notification sent to ${admins.length} admin(s)`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle campaign submitted event: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
