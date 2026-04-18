import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../uploads/storage.service';
import {
  CampaignStatus,
  CampaignAsset,
  InvitationStatus,
} from '@prisma/client';
import { CampaignAssetResponseDto } from './dto/campaign-asset-response.dto';

export const ASSETS_BUCKET = 'campaigns';
const BUCKET = ASSETS_BUCKET;
const MAX_ASSETS_PER_CAMPAIGN = 10;
const EDITABLE_STATUSES: CampaignStatus[] = [
  CampaignStatus.draft,
  CampaignStatus.rejected,
];

@Injectable()
export class CampaignAssetsService {
  private readonly logger = new Logger(CampaignAssetsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ----- shared guards -----

  private async getClientId(supabaseId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  private async getCreatorId(supabaseId: string): Promise<string> {
    const creator = await this.prisma.creator.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');
    return creator.id;
  }

  private async ensureOwnedCampaign(
    campaignId: string,
    clientId: string,
  ): Promise<{ id: string; clientId: string; status: CampaignStatus }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true, status: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return campaign;
  }

  private assertEditable(status: CampaignStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Assets can only be changed while campaign is in draft or rejected status',
      );
    }
  }

  private toDto(row: CampaignAsset): CampaignAssetResponseDto {
    return {
      id: row.id,
      fileName: row.fileName,
      url: this.storage.getPublicUrl(BUCKET, row.storagePath),
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }

  // ----- client ops -----

  async uploadForClient(
    campaignId: string,
    supabaseId: string,
    file: Express.Multer.File,
  ): Promise<CampaignAssetResponseDto> {
    if (!file) throw new BadRequestException('No file provided');

    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.ensureOwnedCampaign(campaignId, clientId);
    this.assertEditable(campaign.status);

    // Fail fast on over-limit to avoid a wasted storage write. The authoritative
    // count lives inside the serializable transaction below (TOCTOU guard).
    const preCount = await this.prisma.campaignAsset.count({
      where: { campaignId },
    });
    if (preCount >= MAX_ASSETS_PER_CAMPAIGN) {
      throw new ConflictException(
        `Asset limit reached: max ${MAX_ASSETS_PER_CAMPAIGN} per campaign`,
      );
    }

    const uploaded = await this.storage.uploadAsset(BUCKET, file, campaignId);

    try {
      const row = await this.prisma.$transaction(
        async (tx) => {
          const count = await tx.campaignAsset.count({ where: { campaignId } });
          if (count >= MAX_ASSETS_PER_CAMPAIGN) {
            throw new ConflictException(
              `Asset limit reached: max ${MAX_ASSETS_PER_CAMPAIGN} per campaign`,
            );
          }
          return tx.campaignAsset.create({
            data: {
              campaignId,
              fileName: file.originalname,
              storagePath: uploaded.path,
              mimeType: file.mimetype,
              sizeBytes: file.size,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return this.toDto(row);
    } catch (err) {
      await this.storage
        .delete(BUCKET, uploaded.path)
        .catch((e) =>
          this.logger.warn(
            `Failed to roll back storage for campaign ${campaignId}: ${e}`,
          ),
        );
      throw err;
    }
  }

  async listForClient(
    campaignId: string,
    supabaseId: string,
  ): Promise<CampaignAssetResponseDto[]> {
    const clientId = await this.getClientId(supabaseId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        clientId: true,
        assets: { orderBy: { uploadedAt: 'asc' } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    const rows = campaign.assets;
    return rows.map((r) => this.toDto(r));
  }

  async deleteForClient(
    campaignId: string,
    assetId: string,
    supabaseId: string,
  ): Promise<void> {
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.ensureOwnedCampaign(campaignId, clientId);
    this.assertEditable(campaign.status);

    const asset = await this.prisma.campaignAsset.findUnique({
      where: { id: assetId },
      select: { id: true, campaignId: true, storagePath: true },
    });
    if (!asset || asset.campaignId !== campaignId) {
      throw new NotFoundException('Asset not found');
    }

    await this.prisma.campaignAsset.delete({ where: { id: assetId } });
    await this.storage
      .delete(BUCKET, asset.storagePath)
      .catch((e) =>
        this.logger.warn(
          `Storage delete failed for asset ${assetId} in campaign ${campaignId} (${asset.storagePath}); DB row removed: ${e}`,
        ),
      );
  }

  // ----- admin ops -----

  async listForAdmin(campaignId: string): Promise<CampaignAssetResponseDto[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const rows = await this.prisma.campaignAsset.findMany({
      where: { campaignId },
      orderBy: { uploadedAt: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  // ----- creator ops -----

  async listForCreator(
    campaignId: string,
    supabaseId: string,
  ): Promise<CampaignAssetResponseDto[]> {
    const creatorId = await this.getCreatorId(supabaseId);

    const invitation = await this.prisma.invitation.findUnique({
      where: {
        campaignId_creatorId: { campaignId, creatorId },
      },
      select: { status: true },
    });
    const activeStatuses: InvitationStatus[] = [
      InvitationStatus.pending,
      InvitationStatus.accepted,
    ];
    if (!invitation || !activeStatuses.includes(invitation.status)) {
      throw new ForbiddenException(
        'You do not have an active invitation for this campaign',
      );
    }

    const rows = await this.prisma.campaignAsset.findMany({
      where: { campaignId },
      orderBy: { uploadedAt: 'asc' },
    });
    return rows.map((r) => this.toDto(r));
  }
}
