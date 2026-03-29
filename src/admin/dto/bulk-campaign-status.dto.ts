import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CampaignStatus } from '@prisma/client';

export class BulkCampaignStatusDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  campaignIds: string[];

  @ApiProperty({ enum: CampaignStatus, example: 'active' })
  @IsEnum(CampaignStatus)
  toStatus: CampaignStatus;

  @ApiPropertyOptional({ example: 'Bulk approved' })
  @IsOptional()
  @IsString()
  note?: string;
}
