import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMaxSize } from 'class-validator';

export class UpdateShortlistDto {
  @ApiProperty({ example: ['creator-uuid-1', 'creator-uuid-2'] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  creatorIds: string[];
}
