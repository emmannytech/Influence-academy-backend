import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller()
export class InvitationsController {
  constructor(private invitationsService: InvitationsService) {}

  @Post('client/campaigns/:campaignId/invitations/send')
  @Roles(['client'])
  @ApiOperation({ summary: 'Send invitations to shortlisted creators' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Invitations sent' })
  @ApiResponse({ status: 400, description: 'No creators to invite' })
  sendInvitations(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.invitationsService.sendInvitations(campaignId, supabaseId);
  }

  @Get('creator/invitations')
  @Roles(['creator'])
  @ApiOperation({ summary: 'List creator invitations' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  getCreatorInvitations(@CurrentUser('supabaseId') supabaseId: string) {
    return this.invitationsService.getCreatorInvitations(supabaseId);
  }

  @Patch('creator/invitations/:invitationId')
  @Roles(['creator'])
  @ApiOperation({ summary: 'Accept or decline an invitation' })
  @ApiParam({ name: 'invitationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Invitation response recorded' })
  @ApiResponse({ status: 400, description: 'Already responded' })
  respondToInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Body() dto: RespondInvitationDto,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.invitationsService.respondToInvitation(
      invitationId,
      dto.action,
      supabaseId,
    );
  }

  @Get('client/campaigns/:campaignId/invitations')
  @Roles(['client'])
  @ApiOperation({ summary: 'Get invitation status for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Invitations with counts' })
  getCampaignInvitations(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.invitationsService.getCampaignInvitations(
      campaignId,
      supabaseId,
    );
  }
}
