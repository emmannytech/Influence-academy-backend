import { ApiProperty } from '@nestjs/swagger';
import { KpiType, SubmissionStatus } from '@prisma/client';

export class ProofDto {
  @ApiProperty() id: string;
  @ApiProperty() fileName: string;
  @ApiProperty() url: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() uploadedAt: string;
}

export class PostSubmissionDto {
  @ApiProperty() id: string;
  @ApiProperty() campaignId: string;
  @ApiProperty() creatorId: string;
  @ApiProperty() platform: string;
  @ApiProperty() postUrl: string;
  @ApiProperty({ nullable: true }) postedAt: string | null;
  @ApiProperty({ nullable: true }) reach: number | null;
  @ApiProperty({ nullable: true }) impressions: number | null;
  @ApiProperty({ nullable: true }) views: number | null;
  @ApiProperty({ nullable: true }) engagement: number | null;
  @ApiProperty({ nullable: true }) clicks: number | null;
  @ApiProperty({ nullable: true }) conversions: number | null;
  @ApiProperty({ enum: SubmissionStatus }) status: SubmissionStatus;
  @ApiProperty({ nullable: true }) reviewNote: string | null;
  @ApiProperty() submittedAt: string;
  @ApiProperty({ nullable: true }) reviewedAt: string | null;
  @ApiProperty({ type: [ProofDto] }) proofs: ProofDto[];
}

export class OverrideDto {
  @ApiProperty() id: string;
  @ApiProperty() campaignId: string;
  @ApiProperty() creatorId: string;
  @ApiProperty({ enum: KpiType }) type: KpiType;
  @ApiProperty() reportedValue: number;
  @ApiProperty({ nullable: true }) note: string | null;
  @ApiProperty({ enum: SubmissionStatus }) status: SubmissionStatus;
  @ApiProperty({ nullable: true }) reviewNote: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty({ nullable: true }) reviewedAt: string | null;
  @ApiProperty({ type: [ProofDto] }) proofs: ProofDto[];
}

export class KpiProgressDto {
  @ApiProperty({ enum: KpiType }) type: KpiType;
  @ApiProperty() targetValue: number;
  @ApiProperty() approvedValue: number;
  @ApiProperty() pendingValue: number;
  @ApiProperty() done: boolean;
}

export class CreatorDeliverablesBundleDto {
  @ApiProperty({ type: [KpiProgressDto] }) progress: KpiProgressDto[];
  @ApiProperty({ type: [PostSubmissionDto] }) posts: PostSubmissionDto[];
  @ApiProperty({ type: [OverrideDto] }) overrides: OverrideDto[];
}

export class CreatorProgressGroupDto {
  @ApiProperty() creatorId: string;
  @ApiProperty() creatorName: string;
  @ApiProperty({ type: [KpiProgressDto] }) progress: KpiProgressDto[];
  @ApiProperty({ type: [PostSubmissionDto] }) posts: PostSubmissionDto[];
  @ApiProperty({ type: [OverrideDto] }) overrides: OverrideDto[];
}

export class ClientDeliverablesBundleDto {
  @ApiProperty({ type: [CreatorProgressGroupDto] }) creators: CreatorProgressGroupDto[];
  @ApiProperty() totalPending: number;
}
