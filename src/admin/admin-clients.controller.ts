import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminClientsService } from './admin-clients.service';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminClientQueryDto } from './dto/admin-client-query.dto';

@ApiTags('Admin — Clients')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/clients')
export class AdminClientsController {
  constructor(private adminClientsService: AdminClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List/filter/search clients' })
  @ApiResponse({ status: 200, description: 'Paginated client list' })
  findAll(@Query() query: AdminClientQueryDto) {
    return this.adminClientsService.findAll(query);
  }

  @Get(':clientId')
  @ApiOperation({ summary: 'Get client details' })
  @ApiParam({ name: 'clientId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Client details' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  findOne(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.adminClientsService.findOne(clientId);
  }
}
