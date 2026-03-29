import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignStatusLogsController } from './campaign-status-logs.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [CampaignsController, CampaignStatusLogsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
