import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character';

export enum ClientTypeDto {
  BRAND = 'brand',
  AGENCY = 'agency',
}

export class RegisterClientDto {
  @ApiProperty({ example: 'jane@brand.com' })
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

  @ApiProperty({ enum: ClientTypeDto, example: 'brand' })
  @IsEnum(ClientTypeDto)
  companyType!: ClientTypeDto;

  @ApiPropertyOptional({ example: 'https://brand.com' })
  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/verify-email',
    description: 'URL to redirect to after email confirmation',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  emailRedirectTo?: string;
}
