import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';

@ApiTags('Creator')
@ApiBearerAuth()
@Roles(['creator'])
@Controller('creator')
export class CreatorsController {
  constructor(private creatorsService: CreatorsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get creator profile' })
  @ApiResponse({ status: 200, description: 'Creator profile data' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.creatorsService.getProfile(user.supabaseId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update creator profile (draft/rejected only)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({
    status: 400,
    description: 'Profile is locked or validation error',
  })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCreatorProfileDto,
  ) {
    return this.creatorsService.updateProfile(user.supabaseId, dto);
  }

  @Post('profile/submit')
  @ApiOperation({ summary: 'Submit creator profile for review' })
  @ApiResponse({ status: 200, description: 'Profile submitted for review' })
  @ApiResponse({
    status: 400,
    description: 'Missing required fields or invalid status',
  })
  submitProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.creatorsService.submitProfile(user.supabaseId);
  }

  @Post('profile/reopen-draft')
  @ApiOperation({ summary: 'Reopen rejected profile as draft' })
  @ApiResponse({ status: 200, description: 'Profile reopened as draft' })
  @ApiResponse({
    status: 400,
    description: 'Profile is not in rejected status',
  })
  reopenDraft(@CurrentUser() user: AuthenticatedUser) {
    return this.creatorsService.reopenDraft(user.supabaseId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get creator dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.creatorsService.getDashboard(user.supabaseId);
  }
}
