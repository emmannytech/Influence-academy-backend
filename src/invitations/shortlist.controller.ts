import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ShortlistService } from './shortlist.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateShortlistDto } from './dto/update-shortlist.dto';
import { ShareLinkDecisionDto } from './dto/share-link-decision.dto';

@ApiTags('Campaign Shortlist')
@ApiBearerAuth()
@Controller()
export class ShortlistController {
  constructor(private shortlistService: ShortlistService) {}

  @Get('client/campaigns/:campaignId/shortlist')
  @Roles(['client'])
  @ApiOperation({ summary: 'Get shortlisted creators for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Shortlist with creators' })
  getShortlist(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.shortlistService.getShortlist(campaignId, supabaseId);
  }

  @Put('client/campaigns/:campaignId/shortlist')
  @Roles(['client'])
  @ApiOperation({ summary: 'Set shortlisted creators for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Shortlist updated' })
  updateShortlist(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateShortlistDto,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.shortlistService.updateShortlist(
      campaignId,
      dto.creatorIds,
      supabaseId,
    );
  }

  @Post('client/campaigns/:campaignId/shortlist/share-links')
  @Roles(['client'])
  @ApiOperation({ summary: 'Generate a shareable shortlist review link' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Share link created' })
  createShareLink(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.shortlistService.createShareLink(campaignId, supabaseId);
  }

  @Get('client/campaigns/:campaignId/shortlist/share-links/latest')
  @Roles(['client'])
  @ApiOperation({ summary: 'Get the latest share link for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Latest share link' })
  @ApiResponse({ status: 404, description: 'No share link found' })
  getLatestShareLink(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.shortlistService.getLatestShareLink(campaignId, supabaseId);
  }

  @Get('public/shortlist/review/:token')
  @Public()
  @ApiOperation({ summary: 'Load shortlist by share token (public)' })
  @ApiParam({ name: 'token', type: 'string' })
  @ApiResponse({ status: 200, description: 'Shortlist data' })
  @ApiResponse({ status: 400, description: 'Link expired' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  getShortlistByToken(@Param('token') token: string) {
    return this.shortlistService.getShortlistByToken(token);
  }

  @Post('public/shortlist/review/:token/decisions')
  @Public()
  @ApiOperation({
    summary: 'Submit a decision on a shortlisted creator (public)',
  })
  @ApiParam({ name: 'token', type: 'string' })
  @ApiResponse({ status: 200, description: 'Decision recorded' })
  submitDecision(
    @Param('token') token: string,
    @Body() dto: ShareLinkDecisionDto,
  ) {
    return this.shortlistService.submitDecision(
      token,
      dto.creatorId,
      dto.decision,
    );
  }
}
