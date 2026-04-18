import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CampaignStatus, KpiType } from '@prisma/client';
import { KpiResponseDto } from './dto/kpi-response.dto';
import { UpdateKpisDto } from './dto/update-kpis.dto';

const EDITABLE_STATUSES: CampaignStatus[] = [
  CampaignStatus.draft,
  CampaignStatus.rejected,
];

@Injectable()
export class CampaignKpisService {
  constructor(private prisma: PrismaService) {}

  private async getClientId(supabaseId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client profile not found');
    return client.id;
  }

  private async ensureOwnedCampaign(
    campaignId: string,
    clientId: string,
  ): Promise<{ status: CampaignStatus }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true, status: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return { status: campaign.status };
  }

  private formatResponse(
    rows: Array<{ type: KpiType; targetValue: number }>,
  ): KpiResponseDto {
    const postRow = rows.find((r) => r.type === KpiType.posts);
    const metrics = rows
      .filter((r) => r.type !== KpiType.posts)
      .map((r) => ({ type: r.type, targetValue: r.targetValue }));
    return { postTarget: postRow?.targetValue ?? 1, metrics };
  }

  async listForClient(
    campaignId: string,
    supabaseId: string,
  ): Promise<KpiResponseDto> {
    const clientId = await this.getClientId(supabaseId);
    await this.ensureOwnedCampaign(campaignId, clientId);
    const rows = await this.prisma.campaignKpi.findMany({
      where: { campaignId },
      select: { type: true, targetValue: true },
    });
    return this.formatResponse(rows);
  }

  async replaceForClient(
    campaignId: string,
    supabaseId: string,
    dto: UpdateKpisDto,
  ): Promise<KpiResponseDto> {
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.ensureOwnedCampaign(campaignId, clientId);
    if (!EDITABLE_STATUSES.includes(campaign.status)) {
      throw new BadRequestException(
        'KPI targets can only be changed while campaign is in draft or rejected status',
      );
    }

    const metricTypes = dto.metrics.map((m) => m.type);
    if (new Set(metricTypes).size !== metricTypes.length) {
      throw new BadRequestException('Duplicate KPI types in metrics');
    }
    if (metricTypes.includes(KpiType.posts)) {
      throw new BadRequestException(
        'Use postTarget for posts; do not include in metrics array',
      );
    }

    const allRows = [
      { campaignId, type: KpiType.posts, targetValue: dto.postTarget },
      ...dto.metrics.map((m) => ({
        campaignId,
        type: m.type,
        targetValue: m.targetValue,
      })),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignKpi.deleteMany({ where: { campaignId } });
      await tx.campaignKpi.createMany({ data: allRows });
    });

    // Build response from the rows we just wrote — no second round-trip, no TOCTOU risk
    return this.formatResponse(
      allRows.map((r) => ({ type: r.type, targetValue: r.targetValue })),
    );
  }
}
