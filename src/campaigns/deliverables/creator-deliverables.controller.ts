/// <reference types="multer" />
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignDeliverablesService } from './deliverables.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitPostDto } from './dto/submit-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SaveOverrideDto } from './dto/save-override.dto';
import {
  CreatorDeliverablesBundleDto,
  OverrideDto,
  PostSubmissionDto,
  ProofDto,
} from './dto/deliverables-response.dto';

@ApiTags('Creator Campaign Deliverables')
@ApiBearerAuth()
@Roles(['creator'])
@Controller()
export class CreatorDeliverablesController {
  constructor(private service: CampaignDeliverablesService) {}

  @Get('creator/campaigns/:campaignId/deliverables')
  @ApiOperation({ summary: 'Get my deliverables bundle for a campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: CreatorDeliverablesBundleDto })
  bundle(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    return this.service.getCreatorBundle(campaignId, supabaseId);
  }

  @Post('creator/campaigns/:campaignId/posts')
  @ApiOperation({ summary: 'Submit a post for this campaign' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: PostSubmissionDto })
  submitPost(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: SubmitPostDto,
  ) {
    return this.service.submitPost(campaignId, supabaseId, dto);
  }

  @Patch('creator/posts/:submissionId')
  @ApiOperation({ summary: 'Edit a pending or rejected post submission' })
  @ApiParam({ name: 'submissionId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: PostSubmissionDto })
  updatePost(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.service.updatePost(submissionId, supabaseId, dto);
  }

  @Post('creator/posts/:submissionId/proofs')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach a screenshot to a post submission' })
  @ApiParam({ name: 'submissionId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: ProofDto })
  addPostProof(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.addPostProof(submissionId, supabaseId, file);
  }

  @Delete('creator/posts/:submissionId/proofs/:proofId')
  @ApiOperation({ summary: 'Remove a screenshot from a post submission' })
  @ApiParam({ name: 'submissionId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'proofId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proof removed' })
  async removePostProof(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Param('proofId', ParseUUIDPipe) proofId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    await this.service.removePostProof(submissionId, proofId, supabaseId);
    return { message: 'Proof removed' };
  }

  @Put('creator/campaigns/:campaignId/metric-overrides')
  @ApiOperation({ summary: 'Upsert an off-platform metric override' })
  @ApiParam({ name: 'campaignId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OverrideDto })
  saveOverride(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @Body() dto: SaveOverrideDto,
  ) {
    return this.service.upsertOverride(campaignId, supabaseId, dto);
  }

  @Post('creator/metric-overrides/:overrideId/proofs')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Attach a screenshot to a metric override' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: ProofDto })
  addOverrideProof(
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @CurrentUser('supabaseId') supabaseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.addOverrideProof(overrideId, supabaseId, file);
  }

  @Delete('creator/metric-overrides/:overrideId/proofs/:proofId')
  @ApiOperation({ summary: 'Remove a screenshot from a metric override' })
  @ApiParam({ name: 'overrideId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'proofId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proof removed' })
  async removeOverrideProof(
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
    @Param('proofId', ParseUUIDPipe) proofId: string,
    @CurrentUser('supabaseId') supabaseId: string,
  ) {
    await this.service.removeOverrideProof(overrideId, proofId, supabaseId);
    return { message: 'Proof removed' };
  }
}
