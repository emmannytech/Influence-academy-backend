import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { Public } from '../common/decorators/public.decorator';
import { MarketplaceCreatorQueryDto } from './dto/marketplace-creator-query.dto';
import { MarketplaceCampaignQueryDto } from './dto/marketplace-campaign-query.dto';

@ApiTags('Marketplace')
@Public()
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Get('creators')
  @ApiOperation({ summary: 'Browse approved creators' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of approved creators',
  })
  findCreators(@Query() query: MarketplaceCreatorQueryDto) {
    return this.marketplaceService.findCreators(query);
  }

  @Get('creators/:creatorId')
  @ApiOperation({ summary: 'Get creator public profile' })
  @ApiParam({ name: 'creatorId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Creator public profile' })
  @ApiResponse({
    status: 404,
    description: 'Creator not found or not approved',
  })
  findOneCreator(@Param('creatorId', ParseUUIDPipe) creatorId: string) {
    return this.marketplaceService.findOneCreator(creatorId);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Browse active campaigns' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of active campaigns',
  })
  findCampaigns(@Query() query: MarketplaceCampaignQueryDto) {
    return this.marketplaceService.findCampaigns(query);
  }
}
