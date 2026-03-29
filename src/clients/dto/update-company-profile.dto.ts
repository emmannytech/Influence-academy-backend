import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsEnum, IsUrl } from 'class-validator';

export enum ClientTypeDto {
  BRAND = 'brand',
  AGENCY = 'agency',
}

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ enum: ClientTypeDto, example: 'brand' })
  @IsOptional()
  @IsEnum(ClientTypeDto)
  companyType?: ClientTypeDto;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl()
  companyWebsite?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  @IsOptional()
  @IsString()
  contactPersonName?: string;

  @ApiPropertyOptional({ example: 'john@acme.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '123 Business Ave, Lagos' })
  @IsOptional()
  @IsString()
  officeAddress?: string;

  @ApiPropertyOptional({
    example: 'https://supabase.co/storage/v1/object/public/logos/...',
  })
  @IsOptional()
  @IsString()
  companyLogo?: string;
}
