import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  Query,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminCreatorsService } from './admin-creators.service';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminCreatorQueryDto } from './dto/admin-creator-query.dto';
import { UpdateCreatorStatusDto } from './dto/update-creator-status.dto';
import { UpdateInternalNotesDto } from './dto/update-internal-notes.dto';

@ApiTags('Admin — Creators')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/creators')
export class AdminCreatorsController {
  constructor(private adminCreatorsService: AdminCreatorsService) {}

  @Get()
  @ApiOperation({ summary: 'List/filter/search creators' })
  @ApiResponse({ status: 200, description: 'Paginated creator list' })
  findAll(@Query() query: AdminCreatorQueryDto) {
    return this.adminCreatorsService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export creators as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="creators.csv"')
  exportCsv(@Query() query: AdminCreatorQueryDto) {
    return this.adminCreatorsService.exportCsv(query);
  }

  @Get(':creatorId')
  @ApiOperation({ summary: 'Get creator details' })
  @ApiParam({ name: 'creatorId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Creator details' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  findOne(@Param('creatorId', ParseUUIDPipe) creatorId: string) {
    return this.adminCreatorsService.findOne(creatorId);
  }

  @Patch(':creatorId/status')
  @ApiOperation({ summary: 'Update creator review status' })
  @ApiParam({ name: 'creatorId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status or missing reason' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  updateStatus(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: UpdateCreatorStatusDto,
  ) {
    return this.adminCreatorsService.updateStatus(creatorId, dto);
  }

  @Put(':creatorId/notes')
  @ApiOperation({ summary: 'Update admin internal notes for a creator' })
  @ApiParam({ name: 'creatorId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notes updated' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  updateNotes(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: UpdateInternalNotesDto,
  ) {
    return this.adminCreatorsService.updateInternalNotes(creatorId, dto.notes);
  }
}
