import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { NotificationListener } from './notification.listener';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationListener],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
