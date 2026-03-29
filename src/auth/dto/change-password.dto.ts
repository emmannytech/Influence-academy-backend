import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssword1' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewP@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
