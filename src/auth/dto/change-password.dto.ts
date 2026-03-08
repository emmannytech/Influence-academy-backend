import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'NewP@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
