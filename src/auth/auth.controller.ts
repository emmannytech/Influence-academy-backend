import { Controller, Get, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RegisterCreatorDto } from './dto/register-creator.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user context' })
  @ApiResponse({
    status: 200,
    description:
      'Returns the authenticated user with role-specific profile IDs',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user);
  }

  @Public()
  @Post('register/creator')
  @ApiOperation({ summary: 'Register a new creator account' })
  @ApiResponse({ status: 201, description: 'Creator registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or email taken' })
  registerCreator(@Body() dto: RegisterCreatorDto) {
    return this.authService.registerCreator(dto);
  }

  @Public()
  @Post('register/client')
  @ApiOperation({ summary: 'Register a new client (brand/agency) account' })
  @ApiResponse({ status: 201, description: 'Client registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error, consumer email domain, or email taken',
  })
  registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('password/change')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }
}
