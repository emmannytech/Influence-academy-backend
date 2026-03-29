import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateSetupItemDto {
  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({
    example: 'nigeria',
    description: 'Auto-generated from label if omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  value?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description:
      'Parent setup item ID (required for cities, must reference a country)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
