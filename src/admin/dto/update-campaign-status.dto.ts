import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CampaignStatus } from '@prisma/client';

export class UpdateCampaignStatusDto {
  @ApiProperty({ enum: CampaignStatus, example: 'active' })
  @IsEnum(CampaignStatus)
  toStatus: CampaignStatus;

  @ApiPropertyOptional({ example: 'Approved for creator selection' })
  @IsOptional()
  @IsString()
  note?: string;
}
