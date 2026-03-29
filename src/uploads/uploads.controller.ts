/// <reference types="multer" />
import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from './storage.service';
import { PrismaService } from '../database/prisma.service';

const BUCKETS = {
  avatars: 'avatars',
  logos: 'logos',
  campaigns: 'campaigns',
} as const;

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(
    private storageService: StorageService,
    private prisma: PrismaService,
  ) {}

  @Post('avatar')
  @Roles(['creator'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload creator profile picture' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded' })
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const creator = await this.prisma.creator.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!creator) throw new BadRequestException('Creator profile not found');

    // Delete old avatar if exists
    if (creator.profilePicture) {
      await this.storageService.delete(BUCKETS.avatars, creator.profilePicture);
    }

    const result = await this.storageService.upload(
      BUCKETS.avatars,
      file,
      creator.id,
    );

    await this.prisma.creator.update({
      where: { id: creator.id },
      data: { profilePicture: result.path },
    });

    return { url: result.publicUrl };
  }

  @Delete('avatar')
  @Roles(['creator'])
  @ApiOperation({ summary: 'Delete creator profile picture' })
  @ApiResponse({ status: 200, description: 'Avatar deleted' })
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    const creator = await this.prisma.creator.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!creator) throw new BadRequestException('Creator profile not found');
    if (!creator.profilePicture) {
      throw new BadRequestException('No avatar to delete');
    }

    await this.storageService.delete(BUCKETS.avatars, creator.profilePicture);

    await this.prisma.creator.update({
      where: { id: creator.id },
      data: { profilePicture: null },
    });

    return { message: 'Avatar deleted' };
  }

  @Post('logo')
  @Roles(['client'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload client company logo' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Logo uploaded' })
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!client) throw new BadRequestException('Client profile not found');

    // Delete old logo if exists
    if (client.companyLogo) {
      await this.storageService.delete(BUCKETS.logos, client.companyLogo);
    }

    const result = await this.storageService.upload(
      BUCKETS.logos,
      file,
      client.id,
    );

    await this.prisma.client.update({
      where: { id: client.id },
      data: { companyLogo: result.path },
    });

    return { url: result.publicUrl };
  }

  @Delete('logo')
  @Roles(['client'])
  @ApiOperation({ summary: 'Delete client company logo' })
  @ApiResponse({ status: 200, description: 'Logo deleted' })
  async deleteLogo(@CurrentUser() user: AuthenticatedUser) {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!client) throw new BadRequestException('Client profile not found');
    if (!client.companyLogo) {
      throw new BadRequestException('No logo to delete');
    }

    await this.storageService.delete(BUCKETS.logos, client.companyLogo);

    await this.prisma.client.update({
      where: { id: client.id },
      data: { companyLogo: null },
    });

    return { message: 'Logo deleted' };
  }

  @Post('campaign/:campaignId/image')
  @Roles(['client'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload campaign cover image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Campaign image uploaded' })
  async uploadCampaignImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Param('campaignId') campaignId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!client) throw new BadRequestException('Client profile not found');

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new BadRequestException('Campaign not found');
    if (campaign.clientId !== client.id) {
      throw new BadRequestException('You do not own this campaign');
    }

    // Delete old cover image if exists
    if (campaign.coverImage) {
      await this.storageService.delete(BUCKETS.campaigns, campaign.coverImage);
    }

    const result = await this.storageService.upload(
      BUCKETS.campaigns,
      file,
      campaignId,
    );

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { coverImage: result.path },
    });

    return { url: result.publicUrl };
  }

  @Delete('campaign/:campaignId/image')
  @Roles(['client'])
  @ApiOperation({ summary: 'Delete campaign cover image' })
  @ApiResponse({ status: 200, description: 'Campaign image deleted' })
  async deleteCampaignImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId') campaignId: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId: user.supabaseId } },
    });
    if (!client) throw new BadRequestException('Client profile not found');

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new BadRequestException('Campaign not found');
    if (campaign.clientId !== client.id) {
      throw new BadRequestException('You do not own this campaign');
    }
    if (!campaign.coverImage) {
      throw new BadRequestException('No cover image to delete');
    }

    await this.storageService.delete(BUCKETS.campaigns, campaign.coverImage);

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { coverImage: null },
    });

    return { message: 'Campaign image deleted' };
  }
}
