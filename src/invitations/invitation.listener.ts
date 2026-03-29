import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';

interface InvitationSentPayload {
  creatorUserId: string;
  creatorEmail: string;
  creatorName: string;
  campaignTitle: string;
  campaignId: string;
  clientName: string;
}

interface InvitationRespondedPayload {
  clientUserId: string;
  campaignTitle: string;
  campaignId: string;
  creatorId: string;
  action: 'accept' | 'decline';
}

@Injectable()
export class InvitationListener {
  private readonly logger = new Logger(InvitationListener.name);

  constructor(
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  @OnEvent('invitation.sent')
  async handleInvitationSent(payload: InvitationSentPayload) {
    try {
      const {
        creatorUserId,
        creatorEmail,
        creatorName,
        campaignTitle,
        campaignId,
        clientName,
      } = payload;

      await this.notificationsService.create({
        userId: creatorUserId,
        type: 'info',
        title: 'New Campaign Invitation',
        message: `You've been invited to the campaign "${campaignTitle}" by ${clientName}.`,
        metadata: { campaignId },
      });

      await this.emailService.send({
        to: creatorEmail,
        subject: `Influence Academy — New Campaign Invitation`,
        html: `
          <h2>You've Been Invited!</h2>
          <p>Hi ${creatorName},</p>
          <p><strong>${clientName}</strong> has invited you to join the campaign <strong>"${campaignTitle}"</strong>.</p>
          <p>Log in to your dashboard to review and respond.</p>
          <p>— The Influence Academy Team</p>
        `,
      });

      this.logger.log(
        `Invitation notification sent to ${creatorEmail} for campaign "${campaignTitle}"`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle invitation sent event: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  @OnEvent('invitation.responded')
  async handleInvitationResponded(payload: InvitationRespondedPayload) {
    try {
      const { clientUserId, campaignTitle, campaignId, action } = payload;
      const verb = action === 'accept' ? 'accepted' : 'declined';

      await this.notificationsService.create({
        userId: clientUserId,
        type: action === 'accept' ? 'success' : 'warning',
        title: `Invitation ${verb}`,
        message: `A creator has ${verb} your invitation for campaign "${campaignTitle}".`,
        metadata: { campaignId, action },
      });

      this.logger.log(
        `Invitation response (${verb}) notification sent for campaign "${campaignTitle}"`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to handle invitation responded event: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
