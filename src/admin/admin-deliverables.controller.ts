import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CampaignDeliverablesService } from '../campaigns/deliverables/deliverables.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientDeliverablesBundleDto } from '../campaigns/deliverables/dto/deliverables-response.dto';

@ApiTags('Admin — Campaign Deliverables')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/campaigns/:campaignId/deliverables')
export class AdminDeliverablesController {
  constructor(private service: CampaignDeliverablesService) {}

  @Get()
  @ApiOperation({ summary: 'Read-only deliverables view for admin oversight' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientDeliverablesBundleDto })
  get(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.service.getAdminBundle(campaignId);
  }
}
