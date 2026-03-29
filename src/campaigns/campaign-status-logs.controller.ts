import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Campaign Status Logs')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignStatusLogsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get(':campaignId/status-logs')
  @Roles(['client', 'admin'])
  @ApiOperation({ summary: 'Get campaign status change history' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of status changes' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  getStatusLogs(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.campaignsService.getStatusLogs(campaignId, supabaseId, role);
  }
}
