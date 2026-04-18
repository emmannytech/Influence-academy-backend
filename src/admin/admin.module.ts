import { Module } from '@nestjs/common';
import { AdminCreatorsService } from './admin-creators.service';
import { AdminCreatorsController } from './admin-creators.controller';
import { AdminCampaignsService } from './admin-campaigns.service';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { AdminCampaignAssetsController } from './admin-campaign-assets.controller';
import { AdminClientsService } from './admin-clients.service';
import { AdminClientsController } from './admin-clients.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminSetupService } from './admin-setup.service';
import { AdminSetupController } from './admin-setup.controller';
import { AdminDeliverablesController } from './admin-deliverables.controller';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [CampaignsModule, UploadsModule],
  controllers: [
    AdminCreatorsController,
    AdminCampaignsController,
    AdminCampaignAssetsController,
    AdminClientsController,
    AdminDashboardController,
    AdminSetupController,
    AdminDeliverablesController,
  ],
  providers: [
    AdminCreatorsService,
    AdminCampaignsService,
    AdminClientsService,
    AdminDashboardService,
    AdminSetupService,
  ],
})
export class AdminModule {}
