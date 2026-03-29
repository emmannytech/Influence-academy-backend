import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, ValidateIf } from 'class-validator';
import { CreatorStatus } from '@prisma/client';

export class UpdateCreatorStatusDto {
  @ApiProperty({
    enum: [
      CreatorStatus.under_review,
      CreatorStatus.approved,
      CreatorStatus.rejected,
    ],
    example: 'approved',
  })
  @IsEnum(CreatorStatus)
  status: CreatorStatus;

  @ApiPropertyOptional({
    example: 'Social media handles could not be verified',
  })
  @ValidateIf((o) => o.status === CreatorStatus.rejected)
  @IsString()
  reason?: string;
}
