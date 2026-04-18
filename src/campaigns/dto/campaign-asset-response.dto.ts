import { ApiProperty } from '@nestjs/swagger';

export class CampaignAssetResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() url!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() uploadedAt!: string;
}
