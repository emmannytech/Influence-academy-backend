import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class RespondInvitationDto {
  @ApiProperty({ enum: ['accept', 'decline'], example: 'accept' })
  @IsEnum(['accept', 'decline'])
  action: 'accept' | 'decline';
}
