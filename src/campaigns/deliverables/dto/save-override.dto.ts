import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { KpiType } from '@prisma/client';

export class SaveOverrideDto {
  @ApiProperty({ enum: KpiType })
  @IsEnum(KpiType)
  type: KpiType;

  @ApiProperty({ example: 450 })
  @IsInt()
  @Min(0)
  reportedValue: number;

  @ApiPropertyOptional({ example: 'UTM link from bio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
