import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewSubmissionDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Screenshot is cropped; please re-upload.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
