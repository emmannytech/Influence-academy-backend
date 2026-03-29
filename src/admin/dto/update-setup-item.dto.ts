import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateSetupItemDto {
  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional({ example: 'nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Parent setup item ID (for cities, must reference a country)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
