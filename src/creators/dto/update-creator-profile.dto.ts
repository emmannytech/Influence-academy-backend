import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialHandlesDto {
  @ApiPropertyOptional({ example: '@creator_ig' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ example: '@creator_tk' })
  @IsOptional()
  @IsString()
  tiktok?: string;

  @ApiPropertyOptional({ example: '@creator_x' })
  @IsOptional()
  @IsString()
  x?: string;

  @ApiPropertyOptional({ example: '@creator_yt' })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://other.com/creator' })
  @IsOptional()
  @IsString()
  other?: string;
}

export class UpdateCreatorProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'nigeria',
    description: 'Country value slug from setup items',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: 'lagos',
    description: 'City value slug from setup items',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Lifestyle and fashion content creator' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: ['fashion', 'lifestyle', 'beauty'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niches?: string[];

  @ApiPropertyOptional({ type: SocialHandlesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialHandlesDto)
  socialHandles?: SocialHandlesDto;

  @ApiPropertyOptional({
    example: 'https://supabase.co/storage/v1/object/public/avatars/...',
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}
