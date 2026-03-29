import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RegisterCreatorDto } from './dto/register-creator.dto';
import { RegisterClientDto } from './dto/register-client.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ClientType } from '@prisma/client';

const CONSUMER_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
];

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private usersService: UsersService,
  ) {}

  async getMe(authUser: AuthenticatedUser) {
    const existing = await this.usersService.findBySupabaseId(
      authUser.supabaseId,
    );

    if (existing) {
      return {
        user: {
          id: existing.id,
          email: existing.email,
          role: existing.role,
          isVerified: existing.isVerified,
        },
        creatorId: existing.creator?.id ?? null,
        clientId: existing.client?.id ?? null,
      };
    }

    // First-time sync: create user based on role from JWT
    if (authUser.role === 'creator') {
      const created = await this.usersService.createCreator({
        supabaseId: authUser.supabaseId,
        email: authUser.email,
      });
      return {
        user: {
          id: created.id,
          email: created.email,
          role: created.role,
          isVerified: created.isVerified,
        },
        creatorId: created.creator?.id ?? null,
        clientId: null,
      };
    }

    if (authUser.role === 'client') {
      const created = await this.usersService.createClient({
        supabaseId: authUser.supabaseId,
        email: authUser.email,
      });
      return {
        user: {
          id: created.id,
          email: created.email,
          role: created.role,
          isVerified: created.isVerified,
        },
        creatorId: null,
        clientId: created.client?.id ?? null,
      };
    }

    throw new BadRequestException('Unknown user role');
  }

  async registerCreator(dto: RegisterCreatorDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: false,
      app_metadata: { role: 'creator' },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const user = await this.usersService.createCreator({
      supabaseId: data.user.id,
      email: dto.email,
    });

    return {
      userId: user.id,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async registerClient(dto: RegisterClientDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Reject consumer email domains
    const emailDomain = dto.email.split('@')[1]?.toLowerCase();
    if (CONSUMER_DOMAINS.includes(emailDomain)) {
      throw new BadRequestException('Please use a business email address');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: false,
      app_metadata: { role: 'client' },
      user_metadata: { companyType: dto.companyType },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const companyType =
      dto.companyType === 'brand' ? ClientType.brand : ClientType.agency;

    const user = await this.usersService.createClient({
      supabaseId: data.user.id,
      email: dto.email,
      companyType,
      companyWebsite: dto.companyWebsite,
    });

    return {
      userId: user.id,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async changePassword(authUser: AuthenticatedUser, dto: ChangePasswordDto) {
    // Verify current password by attempting sign-in
    const supabase = this.supabaseService.getAdminClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: dto.currentPassword,
    });

    if (signInError) {
      throw new BadRequestException('Current password is incorrect');
    }

    const { error } = await supabase.auth.admin.updateUserById(
      authUser.supabaseId,
      { password: dto.newPassword },
    );

    if (error) {
      throw new InternalServerErrorException('Failed to update password');
    }

    return { message: 'Password updated successfully' };
  }
}
