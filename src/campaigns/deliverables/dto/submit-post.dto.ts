import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitPostDto {
  @ApiProperty({ example: 'instagram' })
  @IsString()
  @MaxLength(50)
  platform: string;

  @ApiProperty({ example: 'https://instagram.com/p/xxx' })
  @IsUrl()
  postUrl: string;

  @ApiPropertyOptional({ example: '2026-04-17' })
  @IsOptional()
  @IsDateString()
  postedAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) reach?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) impressions?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) views?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) engagement?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) clicks?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) conversions?: number;
}
