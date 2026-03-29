import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { Public } from '../common/decorators/public.decorator';
import { SetupCategory } from '../common/enums';

@ApiTags('Setup')
@Public()
@Controller('setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active setup data grouped by category' })
  @ApiResponse({
    status: 200,
    description: 'Setup data grouped by category',
  })
  findAll() {
    return this.setupService.findAll();
  }

  @Get('countries/:countryValue/cities')
  @ApiOperation({ summary: 'Get cities for a country (cascading dropdown)' })
  @ApiParam({ name: 'countryValue', example: 'nigeria' })
  @ApiResponse({ status: 200, description: 'List of cities for the country' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  findCitiesByCountry(@Param('countryValue') countryValue: string) {
    return this.setupService.findCitiesByCountry(countryValue);
  }

  @Get(':category')
  @ApiOperation({ summary: 'Get active setup items for a category' })
  @ApiParam({ name: 'category', enum: SetupCategory })
  @ApiResponse({
    status: 200,
    description: 'List of setup items for the category',
  })
  findByCategory(
    @Param('category', new ParseEnumPipe(SetupCategory))
    category: SetupCategory,
  ) {
    return this.setupService.findByCategory(category);
  }
}
