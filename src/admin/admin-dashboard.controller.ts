import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get admin dashboard summary counts' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  getSummary() {
    return this.adminDashboardService.getSummary();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent platform activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Recent activity feed' })
  getActivity(@Query('limit') limit?: number) {
    return this.adminDashboardService.getActivity(limit ? +limit : undefined);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get recent users (creators and clients)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Recent creators and clients' })
  getUsers(@Query('limit') limit?: number) {
    return this.adminDashboardService.getUsers(limit ? +limit : undefined);
  }
}
