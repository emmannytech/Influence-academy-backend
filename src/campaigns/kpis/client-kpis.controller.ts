import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CampaignKpisService } from './kpis.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateKpisDto } from './dto/update-kpis.dto';
import { KpiResponseDto } from './dto/kpi-response.dto';

@ApiTags('Client Campaign KPIs')
@ApiBearerAuth()
@Roles(['client'])
@Controller('client/campaigns/:campaignId/kpis')
export class ClientKpisController {
  constructor(private service: CampaignKpisService) {}

  @Get()
  @ApiOperation({ summary: 'List campaign KPI targets' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KpiResponseDto })
  list(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.listForClient(campaignId, supabaseId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace campaign KPI targets' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: KpiResponseDto })
  @ApiResponse({ status: 400, description: 'Campaign locked or invalid payload' })
  replace(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: UpdateKpisDto,
  ) {
    return this.service.replaceForClient(campaignId, supabaseId, dto);
  }
}
