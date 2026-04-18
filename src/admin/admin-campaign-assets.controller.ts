import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CampaignAssetsService } from '../campaigns/campaign-assets.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CampaignAssetResponseDto } from '../campaigns/dto/campaign-asset-response.dto';

@ApiTags('Admin — Campaign Assets')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/campaigns/:campaignId/assets')
export class AdminCampaignAssetsController {
  constructor(private service: CampaignAssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List campaign assets (admin)' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [CampaignAssetResponseDto] })
  list(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.service.listForAdmin(campaignId);
  }
}
