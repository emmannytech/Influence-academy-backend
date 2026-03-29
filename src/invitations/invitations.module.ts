import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShortlistService } from './shortlist.service';
import { ShortlistController } from './shortlist.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationListener } from './invitation.listener';

@Module({
  imports: [NotificationsModule],
  controllers: [ShortlistController, InvitationsController],
  providers: [ShortlistService, InvitationsService, InvitationListener],
})
export class InvitationsModule {}
