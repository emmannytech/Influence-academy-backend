import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';

export enum ClientTypeDto {
  BRAND = 'brand',
  AGENCY = 'agency',
}

export class RegisterClientDto {
  @ApiProperty({ example: 'jane@brand.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'P@ssword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  confirmPassword: string;

  @ApiProperty({ enum: ClientTypeDto, example: 'brand' })
  @IsEnum(ClientTypeDto)
  companyType: ClientTypeDto;

  @ApiPropertyOptional({ example: 'https://brand.com' })
  @IsOptional()
  @IsUrl()
  companyWebsite?: string;
}
