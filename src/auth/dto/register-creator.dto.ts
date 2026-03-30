import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsUrl,
} from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character';

export class RegisterCreatorDto {
  @ApiProperty({ example: 'creator@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiProperty({ example: 'P@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/verify-email',
    description: 'URL to redirect to after email confirmation',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  emailRedirectTo?: string;
}
