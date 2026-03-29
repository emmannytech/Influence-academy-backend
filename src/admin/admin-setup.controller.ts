import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminSetupService } from './admin-setup.service';
import { Roles } from '../common/decorators/roles.decorator';
import { SetupCategory } from '../common/enums';
import { CreateSetupItemDto } from './dto/create-setup-item.dto';
import { UpdateSetupItemDto } from './dto/update-setup-item.dto';
import { ReorderSetupItemsDto } from './dto/reorder-setup-items.dto';

@ApiTags('Admin — Setup')
@ApiBearerAuth()
@Roles(['admin'])
@Controller('admin/setup')
export class AdminSetupController {
  constructor(private adminSetupService: AdminSetupService) {}

  @Get('country/:countryId/cities')
  @ApiOperation({ summary: 'List cities under a country' })
  @ApiParam({ name: 'countryId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of cities for the country' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  findCitiesByCountry(@Param('countryId', ParseUUIDPipe) countryId: string) {
    return this.adminSetupService.findCitiesByCountry(countryId);
  }

  @Get(':category')
  @ApiOperation({
    summary: 'List all setup items for a category (including inactive)',
  })
  @ApiParam({ name: 'category', enum: SetupCategory })
  @ApiResponse({ status: 200, description: 'List of setup items' })
  findByCategory(
    @Param('category', new ParseEnumPipe(SetupCategory))
    category: SetupCategory,
  ) {
    return this.adminSetupService.findByCategory(category);
  }

  @Post(':category')
  @ApiOperation({ summary: 'Create a new setup item' })
  @ApiParam({ name: 'category', enum: SetupCategory })
  @ApiResponse({ status: 201, description: 'Setup item created' })
  @ApiResponse({ status: 409, description: 'Duplicate value in category' })
  create(
    @Param('category', new ParseEnumPipe(SetupCategory))
    category: SetupCategory,
    @Body() dto: CreateSetupItemDto,
  ) {
    return this.adminSetupService.create(category, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a setup item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Setup item updated' })
  @ApiResponse({ status: 404, description: 'Setup item not found' })
  @ApiResponse({ status: 409, description: 'Duplicate value in category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSetupItemDto,
  ) {
    return this.adminSetupService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a setup item (set inactive)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Setup item deactivated' })
  @ApiResponse({ status: 404, description: 'Setup item not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSetupService.remove(id);
  }

  @Patch(':category/reorder')
  @ApiOperation({ summary: 'Reorder setup items within a category' })
  @ApiParam({ name: 'category', enum: SetupCategory })
  @ApiResponse({ status: 200, description: 'Items reordered' })
  reorder(
    @Param('category', new ParseEnumPipe(SetupCategory))
    category: SetupCategory,
    @Body() dto: ReorderSetupItemsDto,
  ) {
    return this.adminSetupService.reorder(category, dto);
  }
}
