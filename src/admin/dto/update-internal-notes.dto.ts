import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateInternalNotesDto {
  @ApiProperty({ example: 'Verified social accounts, looks good.' })
  @IsString()
  notes: string;
}
