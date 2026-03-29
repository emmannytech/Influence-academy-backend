import { Controller, Get, Put, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@ApiTags('Client')
@ApiBearerAuth()
@Roles(['client'])
@Controller('client')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get('company-profile')
  @ApiOperation({ summary: 'Get client company profile' })
  @ApiResponse({ status: 200, description: 'Company profile data' })
  getCompanyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.getCompanyProfile(user.supabaseId);
  }

  @Put('company-profile')
  @ApiOperation({ summary: 'Update client company profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or consumer email domain',
  })
  updateCompanyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyProfileDto,
  ) {
    return this.clientsService.updateCompanyProfile(user.supabaseId, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get client dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.getDashboard(user.supabaseId);
  }
}
