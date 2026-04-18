/// <reference types="multer" />
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignAssetsService } from './campaign-assets.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CampaignAssetResponseDto } from './dto/campaign-asset-response.dto';

@ApiTags('Client Campaign Assets')
@ApiBearerAuth()
@Roles(['client'])
@Controller('client/campaigns/:campaignId/assets')
export class ClientCampaignAssetsController {
  constructor(private service: CampaignAssetsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a campaign asset (brief/doc/image/zip)' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: CampaignAssetResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file or campaign locked' })
  @ApiResponse({ status: 409, description: 'Asset limit reached' })
  upload(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.uploadForClient(campaignId, supabaseId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List campaign assets' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [CampaignAssetResponseDto] })
  list(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.listForClient(campaignId, supabaseId);
  }

  @Delete(':assetId')
  @ApiOperation({ summary: 'Delete a campaign asset' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'assetId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Asset deleted' })
  @ApiResponse({ status: 400, description: 'Campaign locked' })
  async remove(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    await this.service.deleteForClient(campaignId, assetId, supabaseId);
    return { message: 'Asset deleted' };
  }
}
