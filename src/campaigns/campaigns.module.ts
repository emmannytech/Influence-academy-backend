import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignStatusLogsController } from './campaign-status-logs.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignAssetsService } from './campaign-assets.service';
import { ClientCampaignAssetsController } from './client-campaign-assets.controller';
import { CreatorCampaignAssetsController } from './creator-campaign-assets.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [
    CampaignsController,
    CampaignStatusLogsController,
    ClientCampaignAssetsController,
    CreatorCampaignAssetsController,
  ],
  providers: [CampaignsService, CampaignAssetsService],
  exports: [CampaignsService, CampaignAssetsService],
})
export class CampaignsModule {}
