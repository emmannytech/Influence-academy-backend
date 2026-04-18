import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CampaignDeliverablesService } from './deliverables.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import {
  ClientDeliverablesBundleDto,
  OverrideDto,
  PostSubmissionDto,
} from './dto/deliverables-response.dto';

@ApiTags('Client Campaign Deliverables')
@ApiBearerAuth()
@Roles(['client'])
@Controller('client/campaigns/:campaignId')
export class ClientDeliverablesController {
  constructor(private service: CampaignDeliverablesService) {}

  @Get('deliverables')
  @ApiOperation({ summary: 'Get campaign deliverables grouped by creator' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ClientDeliverablesBundleDto })
  get(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.getClientBundle(campaignId, supabaseId);
  }

  @Patch('posts/:submissionId/review')
  @ApiOperation({ summary: 'Approve or reject a post submission' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'submissionId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: PostSubmissionDto })
  @ApiResponse({ status: 400, description: 'Missing note for reject, or already reviewed' })
  reviewPost(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.service.reviewPost(campaignId, submissionId, supabaseId, dto);
  }

  @Patch('metric-overrides/:overrideId/review')
  @ApiOperation({ summary: 'Approve or reject a metric override' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OverrideDto })
  reviewOverride(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.service.reviewOverride(campaignId, overrideId, supabaseId, dto);
  }
}
