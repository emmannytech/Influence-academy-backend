import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreatorStatus } from '@prisma/client';

export class AdminCreatorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'jane' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CreatorStatus })
  @IsOptional()
  @IsEnum(CreatorStatus)
  status?: CreatorStatus;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'fashion' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  niche?: string;
}
