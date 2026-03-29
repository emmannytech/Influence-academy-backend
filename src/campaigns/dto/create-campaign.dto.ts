import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatorRequirementsDto {
  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'instagram' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minFollowers?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRate?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minEngagement?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minViews?: number;

  @ApiPropertyOptional({ example: ['fashion', 'lifestyle'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niche?: string[];
}

export class CampaignTimelineDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Fashion Campaign 2026' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Looking for fashion influencers to promote our summer collection',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['instagram', 'tiktok'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @ApiPropertyOptional({ type: CreatorRequirementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatorRequirementsDto)
  requirements?: CreatorRequirementsDto;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfCreators?: number;

  @ApiPropertyOptional({ type: CampaignTimelineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTimelineDto)
  timeline?: CampaignTimelineDto;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    example: 'https://supabase.co/storage/v1/object/public/campaigns/...',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;
}
