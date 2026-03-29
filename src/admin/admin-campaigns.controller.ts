import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Body,
  Param,
  Query,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminCampaignsService } from './admin-campaigns.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminCampaignQueryDto } from './dto/admin-campaign-query.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { BulkCampaignStatusDto } from './dto/bulk-campaign-status.dto';
import { UpdateInternalNotesDto } from './dto/update-internal-notes.dto';

@ApiTags('Admin — Campaigns')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private adminCampaignsService: AdminCampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List/filter/search campaigns' })
  @ApiResponse({ status: 200, description: 'Paginated campaign list' })
  findAll(@Query() query: AdminCampaignQueryDto) {
    return this.adminCampaignsService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export campaigns as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="campaigns.csv"')
  exportCsv(@Query() query: AdminCampaignQueryDto) {
    return this.adminCampaignsService.exportCsv(query);
  }

  @Get(':campaignId')
  @ApiOperation({ summary: 'Get campaign details with status logs' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  findOne(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.adminCampaignsService.findOne(campaignId);
  }

  @Patch(':campaignId/status')
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  updateStatus(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateCampaignStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminCampaignsService.updateStatus(
      campaignId,
      dto,
      user.supabaseId,
    );
  }

  @Post('bulk-status')
  @ApiOperation({ summary: 'Bulk update campaign statuses' })
  @ApiResponse({ status: 200, description: 'Bulk update results' })
  bulkUpdateStatus(
    @Body() dto: BulkCampaignStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminCampaignsService.bulkUpdateStatus(dto, user.supabaseId);
  }

  @Put(':campaignId/notes')
  @ApiOperation({ summary: 'Update admin internal notes for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notes updated' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  updateNotes(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateInternalNotesDto,
  ) {
    return this.adminCampaignsService.updateInternalNotes(
      campaignId,
      dto.notes,
    );
  }
}
