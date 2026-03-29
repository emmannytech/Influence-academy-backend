import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export class ShareLinkDecisionDto {
  @ApiProperty({ example: 'creator-uuid-1' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ enum: ['approved', 'rejected'], example: 'approved' })
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';
}
