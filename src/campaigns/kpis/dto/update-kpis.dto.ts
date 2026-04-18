import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KpiType } from '@prisma/client';

export class MetricTargetDto {
  @ApiProperty({ enum: KpiType })
  @IsEnum(KpiType)
  type: KpiType;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  targetValue: number;
}

export class UpdateKpisDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  postTarget: number;

  @ApiProperty({ type: [MetricTargetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricTargetDto)
  metrics: MetricTargetDto[];
}
