import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../uploads/storage.service';
import {
  CampaignMetricOverride,
  CampaignMetricProof,
  CampaignPostProof,
  CampaignPostSubmission,
  CampaignStatus,
  InvitationStatus,
  KpiType,
  SubmissionStatus,
} from '@prisma/client';
import { ASSETS_BUCKET } from '../campaign-assets.service';
import { NotificationEvents } from '../../notifications/notification-events';
import { SubmitPostDto } from './dto/submit-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SaveOverrideDto } from './dto/save-override.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import {
  ClientDeliverablesBundleDto,
  CreatorDeliverablesBundleDto,
  KpiProgressDto,
  OverrideDto,
  PostSubmissionDto,
  ProofDto,
} from './dto/deliverables-response.dto';

const POST_PROOF_PREFIX = (campaignId: string, submissionId: string) =>
  `${campaignId}/proofs/posts/${submissionId}`;
const OVERRIDE_PROOF_PREFIX = (campaignId: string, overrideId: string) =>
  `${campaignId}/proofs/overrides/${overrideId}`;

@Injectable()
export class CampaignDeliverablesService {
  private readonly logger = new Logger(CampaignDeliverablesService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private eventEmitter: EventEmitter2,
  ) {}

  // --- Guards ---

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

  private async ensureActiveCampaign(
    campaignId: string,
  ): Promise<{ id: string; clientId: string; status: CampaignStatus; title: string }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true, status: true, title: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== CampaignStatus.active) {
      throw new BadRequestException('Campaign is not active');
    }
    return campaign;
  }

  private async ensureOwnedCampaign(
    campaignId: string,
    clientId: string,
  ): Promise<{ id: string; clientId: string; status: CampaignStatus; title: string }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, clientId: true, status: true, title: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.clientId !== clientId) {
      throw new ForbiddenException('You do not own this campaign');
    }
    return campaign;
  }

  private async ensureAcceptedInvitation(
    campaignId: string,
    creatorId: string,
  ): Promise<void> {
    const inv = await this.prisma.invitation.findUnique({
      where: { campaignId_creatorId: { campaignId, creatorId } },
      select: { status: true },
    });
    if (!inv || inv.status !== InvitationStatus.accepted) {
      throw new ForbiddenException(
        'You do not have an accepted invitation for this campaign',
      );
    }
  }

  // --- Mapping ---

  private postToDto(
    row: CampaignPostSubmission & { proofs: CampaignPostProof[] },
  ): PostSubmissionDto {
    return {
      id: row.id,
      campaignId: row.campaignId,
      creatorId: row.creatorId,
      platform: row.platform,
      postUrl: row.postUrl,
      postedAt: row.postedAt ? row.postedAt.toISOString() : null,
      reach: row.reach,
      impressions: row.impressions,
      views: row.views,
      engagement: row.engagement,
      clicks: row.clicks,
      conversions: row.conversions,
      status: row.status,
      reviewNote: row.reviewNote,
      submittedAt: row.submittedAt.toISOString(),
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      proofs: row.proofs.map((p) => this.proofToDto(p)),
    };
  }

  private overrideToDto(
    row: CampaignMetricOverride & { proofs: CampaignMetricProof[] },
  ): OverrideDto {
    return {
      id: row.id,
      campaignId: row.campaignId,
      creatorId: row.creatorId,
      type: row.type,
      reportedValue: row.reportedValue,
      note: row.note,
      status: row.status,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      proofs: row.proofs.map((p) => this.proofToDto(p)),
    };
  }

  private proofToDto(
    row: { id: string; fileName: string; storagePath: string; mimeType: string; sizeBytes: number; uploadedAt: Date },
  ): ProofDto {
    return {
      id: row.id,
      fileName: row.fileName,
      url: this.storage.getPublicUrl(ASSETS_BUCKET, row.storagePath),
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }

  // --- Progress computation ---

  private computeProgress(
    targets: Array<{ type: KpiType; targetValue: number }>,
    posts: PostSubmissionDto[],
    overrides: OverrideDto[],
  ): KpiProgressDto[] {
    return targets.map((target) => {
      let approvedValue = 0;
      let pendingValue = 0;

      if (target.type === KpiType.posts) {
        approvedValue = posts.filter((p) => p.status === 'approved').length;
        pendingValue = posts.filter((p) => p.status === 'pending').length;
      } else {
        for (const p of posts) {
          const metric = p[target.type as keyof PostSubmissionDto] as number | null;
          if (metric == null) continue;
          if (p.status === 'approved') approvedValue += metric;
          else if (p.status === 'pending') pendingValue += metric;
        }
        const ov = overrides.find((o) => o.type === target.type);
        if (ov) {
          if (ov.status === 'approved') approvedValue += ov.reportedValue;
          else if (ov.status === 'pending') pendingValue += ov.reportedValue;
        }
      }

      return {
        type: target.type,
        targetValue: target.targetValue,
        approvedValue,
        pendingValue,
        done: approvedValue >= target.targetValue,
      };
    });
  }

  // --- Creator ops ---

  async getCreatorBundle(
    campaignId: string,
    supabaseId: string,
  ): Promise<CreatorDeliverablesBundleDto> {
    const creatorId = await this.getCreatorId(supabaseId);

    const [, targets, posts, overrides] = await Promise.all([
      this.ensureAcceptedInvitation(campaignId, creatorId),
      this.prisma.campaignKpi.findMany({
        where: { campaignId },
        select: { type: true, targetValue: true },
      }),
      this.prisma.campaignPostSubmission.findMany({
        where: { campaignId, creatorId },
        include: { proofs: true },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.campaignMetricOverride.findMany({
        where: { campaignId, creatorId },
        include: { proofs: true },
      }),
    ]);

    const postDtos = posts.map((p) => this.postToDto(p));
    const overrideDtos = overrides.map((o) => this.overrideToDto(o));
    return {
      progress: this.computeProgress(targets, postDtos, overrideDtos),
      posts: postDtos,
      overrides: overrideDtos,
    };
  }

  async submitPost(
    campaignId: string,
    supabaseId: string,
    dto: SubmitPostDto,
  ): Promise<PostSubmissionDto> {
    const creatorId = await this.getCreatorId(supabaseId);
    const [campaign] = await Promise.all([
      this.ensureActiveCampaign(campaignId),
      this.ensureAcceptedInvitation(campaignId, creatorId),
    ]);

    const row = await this.prisma.campaignPostSubmission.create({
      data: {
        campaignId,
        creatorId,
        platform: dto.platform,
        postUrl: dto.postUrl,
        postedAt: dto.postedAt ? new Date(dto.postedAt) : null,
        reach: dto.reach ?? null,
        impressions: dto.impressions ?? null,
        views: dto.views ?? null,
        engagement: dto.engagement ?? null,
        clicks: dto.clicks ?? null,
        conversions: dto.conversions ?? null,
      },
      include: { proofs: true },
    });

    this.eventEmitter.emit(NotificationEvents.POST_SUBMITTED, {
      campaignId,
      campaignTitle: campaign.title,
      submissionId: row.id,
      creatorId,
    });

    return this.postToDto(row);
  }

  async updatePost(
    submissionId: string,
    supabaseId: string,
    dto: UpdatePostDto,
  ): Promise<PostSubmissionDto> {
    const creatorId = await this.getCreatorId(supabaseId);

    const existing = await this.prisma.campaignPostSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!existing) throw new NotFoundException('Submission not found');
    if (existing.creatorId !== creatorId) {
      throw new ForbiddenException('You do not own this submission');
    }
    if (existing.status === SubmissionStatus.approved) {
      throw new BadRequestException('Approved submissions cannot be modified');
    }
    await this.ensureActiveCampaign(existing.campaignId);
    await this.ensureAcceptedInvitation(existing.campaignId, creatorId);

    const row = await this.prisma.campaignPostSubmission.update({
      where: { id: submissionId },
      data: {
        platform: dto.platform,
        postUrl: dto.postUrl,
        postedAt: dto.postedAt ? new Date(dto.postedAt) : undefined,
        reach: dto.reach,
        impressions: dto.impressions,
        views: dto.views,
        engagement: dto.engagement,
        clicks: dto.clicks,
        conversions: dto.conversions,
        status: SubmissionStatus.pending,
        reviewNote: null,
        reviewedAt: null,
      },
      include: { proofs: true },
    });

    return this.postToDto(row);
  }

  async upsertOverride(
    campaignId: string,
    supabaseId: string,
    dto: SaveOverrideDto,
  ): Promise<OverrideDto> {
    if (dto.type === KpiType.posts) {
      throw new BadRequestException(
        'Cannot override posts; submit posts individually',
      );
    }
    const creatorId = await this.getCreatorId(supabaseId);
    await Promise.all([
      this.ensureActiveCampaign(campaignId),
      this.ensureAcceptedInvitation(campaignId, creatorId),
    ]);

    const row = await this.prisma.campaignMetricOverride.upsert({
      where: {
        campaignId_creatorId_type: { campaignId, creatorId, type: dto.type },
      },
      create: {
        campaignId,
        creatorId,
        type: dto.type,
        reportedValue: dto.reportedValue,
        note: dto.note ?? null,
      },
      update: {
        reportedValue: dto.reportedValue,
        note: dto.note ?? null,
        status: SubmissionStatus.pending,
        reviewNote: null,
        reviewedAt: null,
      },
      include: { proofs: true },
    });

    this.eventEmitter.emit(NotificationEvents.METRIC_OVERRIDE_SUBMITTED, {
      campaignId,
      overrideId: row.id,
      creatorId,
    });

    return this.overrideToDto(row);
  }

  // --- Proof ops ---

  async addPostProof(
    submissionId: string,
    supabaseId: string,
    file: Express.Multer.File,
  ): Promise<ProofDto> {
    if (!file) throw new BadRequestException('No file provided');
    const creatorId = await this.getCreatorId(supabaseId);
    const submission = await this.prisma.campaignPostSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.creatorId !== creatorId) {
      throw new ForbiddenException('You do not own this submission');
    }
    if (submission.status === SubmissionStatus.approved) {
      throw new BadRequestException('Cannot add proofs to approved submissions');
    }
    await this.ensureActiveCampaign(submission.campaignId);

    const uploaded = await this.storage.uploadAsset(
      ASSETS_BUCKET,
      file,
      POST_PROOF_PREFIX(submission.campaignId, submissionId),
    );

    try {
      const row = await this.prisma.campaignPostProof.create({
        data: {
          submissionId,
          fileName: file.originalname,
          storagePath: uploaded.path,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
      return this.proofToDto(row);
    } catch (err) {
      await this.storage.delete(ASSETS_BUCKET, uploaded.path).catch((e) =>
        this.logger.warn(`Rollback failed for ${uploaded.path}: ${e}`),
      );
      throw err;
    }
  }

  async removePostProof(
    submissionId: string,
    proofId: string,
    supabaseId: string,
  ): Promise<void> {
    const creatorId = await this.getCreatorId(supabaseId);
    const submission = await this.prisma.campaignPostSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.creatorId !== creatorId) {
      throw new ForbiddenException('You do not own this submission');
    }
    if (submission.status === SubmissionStatus.approved) {
      throw new BadRequestException('Cannot remove proofs from approved submissions');
    }
    await this.ensureActiveCampaign(submission.campaignId);

    const proof = await this.prisma.campaignPostProof.findUnique({
      where: { id: proofId },
      select: { id: true, submissionId: true, storagePath: true },
    });
    if (!proof || proof.submissionId !== submissionId) {
      throw new NotFoundException('Proof not found');
    }
    await this.prisma.campaignPostProof.delete({ where: { id: proofId } });
    await this.storage.delete(ASSETS_BUCKET, proof.storagePath).catch((e) =>
      this.logger.warn(`Storage delete failed for proof ${proofId}: ${e}`),
    );
  }

  async addOverrideProof(
    overrideId: string,
    supabaseId: string,
    file: Express.Multer.File,
  ): Promise<ProofDto> {
    if (!file) throw new BadRequestException('No file provided');
    const creatorId = await this.getCreatorId(supabaseId);
    const override = await this.prisma.campaignMetricOverride.findUnique({
      where: { id: overrideId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!override) throw new NotFoundException('Override not found');
    if (override.creatorId !== creatorId) {
      throw new ForbiddenException('You do not own this override');
    }
    if (override.status === SubmissionStatus.approved) {
      throw new BadRequestException('Cannot add proofs to approved overrides');
    }
    await this.ensureActiveCampaign(override.campaignId);

    const uploaded = await this.storage.uploadAsset(
      ASSETS_BUCKET,
      file,
      OVERRIDE_PROOF_PREFIX(override.campaignId, overrideId),
    );

    try {
      const row = await this.prisma.campaignMetricProof.create({
        data: {
          overrideId,
          fileName: file.originalname,
          storagePath: uploaded.path,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
      return this.proofToDto(row);
    } catch (err) {
      await this.storage.delete(ASSETS_BUCKET, uploaded.path).catch((e) =>
        this.logger.warn(`Rollback failed for ${uploaded.path}: ${e}`),
      );
      throw err;
    }
  }

  async removeOverrideProof(
    overrideId: string,
    proofId: string,
    supabaseId: string,
  ): Promise<void> {
    const creatorId = await this.getCreatorId(supabaseId);
    const override = await this.prisma.campaignMetricOverride.findUnique({
      where: { id: overrideId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!override) throw new NotFoundException('Override not found');
    if (override.creatorId !== creatorId) {
      throw new ForbiddenException('You do not own this override');
    }
    if (override.status === SubmissionStatus.approved) {
      throw new BadRequestException('Cannot remove proofs from approved overrides');
    }
    await this.ensureActiveCampaign(override.campaignId);

    const proof = await this.prisma.campaignMetricProof.findUnique({
      where: { id: proofId },
      select: { id: true, overrideId: true, storagePath: true },
    });
    if (!proof || proof.overrideId !== overrideId) {
      throw new NotFoundException('Proof not found');
    }
    await this.prisma.campaignMetricProof.delete({ where: { id: proofId } });
    await this.storage.delete(ASSETS_BUCKET, proof.storagePath).catch((e) =>
      this.logger.warn(`Storage delete failed for proof ${proofId}: ${e}`),
    );
  }

  // --- Client ops ---

  async getClientBundle(
    campaignId: string,
    supabaseId: string,
  ): Promise<ClientDeliverablesBundleDto> {
    const clientId = await this.getClientId(supabaseId);
    await this.ensureOwnedCampaign(campaignId, clientId);
    return this.buildClientOrAdminBundle(campaignId);
  }

  async getAdminBundle(campaignId: string): Promise<ClientDeliverablesBundleDto> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.buildClientOrAdminBundle(campaignId);
  }

  private async buildClientOrAdminBundle(
    campaignId: string,
  ): Promise<ClientDeliverablesBundleDto> {
    const [invitations, targets, allPosts, allOverrides] = await Promise.all([
      this.prisma.invitation.findMany({
        where: { campaignId, status: InvitationStatus.accepted },
        select: {
          creatorId: true,
          creator: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.campaignKpi.findMany({
        where: { campaignId },
        select: { type: true, targetValue: true },
      }),
      this.prisma.campaignPostSubmission.findMany({
        where: { campaignId },
        include: { proofs: true },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.campaignMetricOverride.findMany({
        where: { campaignId },
        include: { proofs: true },
      }),
    ]);

    let totalPending = 0;
    const creators = invitations.map((inv) => {
      const posts = allPosts
        .filter((p) => p.creatorId === inv.creatorId)
        .map((p) => this.postToDto(p));
      const overrides = allOverrides
        .filter((o) => o.creatorId === inv.creatorId)
        .map((o) => this.overrideToDto(o));
      totalPending += posts.filter((p) => p.status === 'pending').length;
      totalPending += overrides.filter((o) => o.status === 'pending').length;
      return {
        creatorId: inv.creatorId,
        creatorName: inv.creator?.fullName ?? 'Creator',
        progress: this.computeProgress(targets, posts, overrides),
        posts,
        overrides,
      };
    });

    return { creators, totalPending };
  }

  async reviewPost(
    campaignId: string,
    submissionId: string,
    supabaseId: string,
    dto: ReviewSubmissionDto,
  ): Promise<PostSubmissionDto> {
    if (dto.action === 'reject' && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const clientId = await this.getClientId(supabaseId);
    const campaign = await this.ensureOwnedCampaign(campaignId, clientId);

    const existing = await this.prisma.campaignPostSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!existing || existing.campaignId !== campaignId) {
      throw new NotFoundException('Submission not found');
    }
    if (existing.status !== SubmissionStatus.pending) {
      throw new BadRequestException('Submission has already been reviewed');
    }

    const newStatus =
      dto.action === 'approve' ? SubmissionStatus.approved : SubmissionStatus.rejected;

    const row = await this.prisma.campaignPostSubmission.update({
      where: { id: submissionId },
      data: {
        status: newStatus,
        reviewNote: dto.note ?? null,
        reviewedAt: new Date(),
      },
      include: { proofs: true },
    });

    this.eventEmitter.emit(NotificationEvents.POST_REVIEWED, {
      campaignId,
      campaignTitle: campaign.title,
      submissionId,
      creatorId: existing.creatorId,
      status: newStatus,
      note: dto.note ?? null,
    });

    return this.postToDto(row);
  }

  async reviewOverride(
    campaignId: string,
    overrideId: string,
    supabaseId: string,
    dto: ReviewSubmissionDto,
  ): Promise<OverrideDto> {
    if (dto.action === 'reject' && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const clientId = await this.getClientId(supabaseId);
    await this.ensureOwnedCampaign(campaignId, clientId);

    const existing = await this.prisma.campaignMetricOverride.findUnique({
      where: { id: overrideId },
      select: { id: true, campaignId: true, creatorId: true, status: true },
    });
    if (!existing || existing.campaignId !== campaignId) {
      throw new NotFoundException('Override not found');
    }
    if (existing.status !== SubmissionStatus.pending) {
      throw new BadRequestException('Override has already been reviewed');
    }

    const newStatus =
      dto.action === 'approve' ? SubmissionStatus.approved : SubmissionStatus.rejected;

    const row = await this.prisma.campaignMetricOverride.update({
      where: { id: overrideId },
      data: {
        status: newStatus,
        reviewNote: dto.note ?? null,
        reviewedAt: new Date(),
      },
      include: { proofs: true },
    });

    this.eventEmitter.emit(NotificationEvents.METRIC_OVERRIDE_REVIEWED, {
      campaignId,
      overrideId,
      creatorId: existing.creatorId,
      status: newStatus,
    });

    return this.overrideToDto(row);
  }
}
