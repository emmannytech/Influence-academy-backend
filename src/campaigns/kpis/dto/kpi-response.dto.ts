import { ApiProperty } from '@nestjs/swagger';
import { KpiType } from '@prisma/client';

export class KpiDto {
  @ApiProperty({ enum: KpiType }) type: KpiType;
  @ApiProperty() targetValue: number;
}

export class KpiResponseDto {
  @ApiProperty() postTarget: number;
  @ApiProperty({ type: [KpiDto] }) metrics: KpiDto[];
}
