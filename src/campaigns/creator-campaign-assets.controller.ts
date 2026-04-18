import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CampaignAssetsService } from './campaign-assets.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CampaignAssetResponseDto } from './dto/campaign-asset-response.dto';

@ApiTags('Creator Campaign Assets')
@ApiBearerAuth()
@Roles(['creator'])
@Controller('creator/campaigns/:campaignId/assets')
export class CreatorCampaignAssetsController {
  constructor(private service: CampaignAssetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List assets for a campaign the creator was invited to',
  })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [CampaignAssetResponseDto] })
  @ApiResponse({ status: 403, description: 'No active invitation' })
  list(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.listForCreator(campaignId, supabaseId);
  }
}
