import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignStatusLogsController } from './campaign-status-logs.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignAssetsService } from './campaign-assets.service';
import { ClientCampaignAssetsController } from './client-campaign-assets.controller';
import { CreatorCampaignAssetsController } from './creator-campaign-assets.controller';
import { CampaignDeliverablesService } from './deliverables/deliverables.service';
import { DeliverablesListener } from './deliverables/deliverables.listener';
import { ClientDeliverablesController } from './deliverables/client-deliverables.controller';
import { CreatorDeliverablesController } from './deliverables/creator-deliverables.controller';
import { CampaignKpisService } from './kpis/kpis.service';
import { ClientKpisController } from './kpis/client-kpis.controller';
import { UploadsModule } from '../uploads/uploads.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UploadsModule, NotificationsModule],
  controllers: [
    CampaignsController,
    CampaignStatusLogsController,
    ClientCampaignAssetsController,
    CreatorCampaignAssetsController,
    ClientKpisController,
    ClientDeliverablesController,
    CreatorDeliverablesController,
  ],
  providers: [
    CampaignsService,
    CampaignAssetsService,
    CampaignKpisService,
    CampaignDeliverablesService,
    DeliverablesListener,
  ],
  exports: [
    CampaignsService,
    CampaignAssetsService,
    CampaignKpisService,
    CampaignDeliverablesService,
  ],
})
export class CampaignsModule {}
