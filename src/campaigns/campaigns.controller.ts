import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';

@ApiTags('Client Campaigns')
@ApiBearerAuth()
@Roles(['client'])
@Controller('client/campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List client campaigns' })
  @ApiResponse({ status: 200, description: 'Paginated campaign list' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CampaignQueryDto,
  ) {
    return this.campaignsService.findAllByClient(user.supabaseId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.create(user.supabaseId, dto);
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaignsService.findOne(campaignId, user.supabaseId);
  }

  @Put(':campaignId')
  @ApiOperation({ summary: 'Update a draft/rejected campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  @ApiResponse({ status: 400, description: 'Campaign is locked by status' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(campaignId, user.supabaseId, dto);
  }

  @Post(':campaignId/submit')
  @ApiOperation({ summary: 'Submit campaign for review' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign submitted for review' })
  @ApiResponse({
    status: 400,
    description: 'Missing required fields or invalid status transition',
  })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaignsService.submit(campaignId, user.supabaseId);
  }
}
