import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

const mockUsersService = {
  findBySupabaseId: jest.fn(),
  createCreator: jest.fn(),
  createClient: jest.fn(),
};

const mockSupabaseAdmin = {
  auth: {
    admin: {
      createUser: jest.fn(),
      updateUserById: jest.fn(),
    },
    signInWithPassword: jest.fn(),
  },
};

const mockSupabaseService = {
  getAdminClient: jest.fn(() => mockSupabaseAdmin),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockSupabaseService.getAdminClient.mockReturnValue(mockSupabaseAdmin);
  });

  describe('getMe', () => {
    const authUser: AuthenticatedUser = {
      supabaseId: 'supa-1',
      email: 'user@test.com',
      role: 'creator',
    };

    it('should return existing user', async () => {
      const existing = {
        id: 'user-1',
        email: 'user@test.com',
        role: 'creator',
        isVerified: true,
        creator: { id: 'creator-1' },
        client: null,
      };
      mockUsersService.findBySupabaseId.mockResolvedValue(existing);

      const result = await service.getMe(authUser);

      expect(result).toEqual({
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: 'creator',
          isVerified: true,
        },
        creatorId: 'creator-1',
        clientId: null,
      });
      expect(mockUsersService.findBySupabaseId).toHaveBeenCalledWith('supa-1');
    });

    it('should auto-create creator when user does not exist and role is creator', async () => {
      mockUsersService.findBySupabaseId.mockResolvedValue(null);

      const created = {
        id: 'user-2',
        email: 'user@test.com',
        role: 'creator',
        isVerified: false,
        creator: { id: 'creator-2' },
      };
      mockUsersService.createCreator.mockResolvedValue(created);

      const result = await service.getMe(authUser);

      expect(result).toEqual({
        user: {
          id: 'user-2',
          email: 'user@test.com',
          role: 'creator',
          isVerified: false,
        },
        creatorId: 'creator-2',
        clientId: null,
      });
      expect(mockUsersService.createCreator).toHaveBeenCalledWith({
        supabaseId: 'supa-1',
        email: 'user@test.com',
      });
    });

    it('should auto-create client when user does not exist and role is client', async () => {
      mockUsersService.findBySupabaseId.mockResolvedValue(null);

      const created = {
        id: 'user-3',
        email: 'client@brand.com',
        role: 'client',
        isVerified: false,
        client: { id: 'client-1' },
      };
      mockUsersService.createClient.mockResolvedValue(created);

      const clientAuth: AuthenticatedUser = {
        supabaseId: 'supa-2',
        email: 'client@brand.com',
        role: 'client',
      };

      const result = await service.getMe(clientAuth);

      expect(result).toEqual({
        user: {
          id: 'user-3',
          email: 'client@brand.com',
          role: 'client',
          isVerified: false,
        },
        creatorId: null,
        clientId: 'client-1',
      });
      expect(mockUsersService.createClient).toHaveBeenCalledWith({
        supabaseId: 'supa-2',
        email: 'client@brand.com',
      });
    });

    it('should throw BadRequestException for unknown role', async () => {
      mockUsersService.findBySupabaseId.mockResolvedValue(null);

      const unknownRoleAuth: AuthenticatedUser = {
        supabaseId: 'supa-3',
        email: 'admin@test.com',
        role: 'admin',
      };

      await expect(service.getMe(unknownRoleAuth)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('registerCreator', () => {
    it('should register a creator successfully', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'supa-new' } },
        error: null,
      });
      mockUsersService.createCreator.mockResolvedValue({ id: 'user-new' });

      const result = await service.registerCreator({
        email: 'new@creator.com',
        password: 'P@ssword1',
        confirmPassword: 'P@ssword1',
      });

      expect(result).toEqual({
        userId: 'user-new',
        message:
          'Registration successful. Please check your email to verify your account.',
      });
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'new@creator.com',
        password: 'P@ssword1',
        email_confirm: false,
        app_metadata: { role: 'creator' },
      });
      expect(mockUsersService.createCreator).toHaveBeenCalledWith({
        supabaseId: 'supa-new',
        email: 'new@creator.com',
      });
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.registerCreator({
          email: 'new@creator.com',
          password: 'P@ssword1',
          confirmPassword: 'Different1!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });
  });

  describe('registerClient', () => {
    it('should reject consumer email domains', async () => {
      await expect(
        service.registerClient({
          email: 'user@gmail.com',
          password: 'P@ssword1',
          confirmPassword: 'P@ssword1',
          companyType: 'brand' as any,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const authUser: AuthenticatedUser = {
      supabaseId: 'supa-1',
      email: 'user@test.com',
      role: 'creator',
    };

    it('should throw BadRequestException when current password is wrong', async () => {
      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.changePassword(authUser, {
          currentPassword: 'WrongPass1!',
          newPassword: 'NewP@ssword1',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockSupabaseAdmin.auth.admin.updateUserById,
      ).not.toHaveBeenCalled();
    });

    it('should change password successfully', async () => {
      mockSupabaseAdmin.auth.signInWithPassword.mockResolvedValue({
        error: null,
      });
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        error: null,
      });

      const result = await service.changePassword(authUser, {
        currentPassword: 'OldP@ssword1',
        newPassword: 'NewP@ssword1',
      });

      expect(result).toEqual({ message: 'Password updated successfully' });
      expect(mockSupabaseAdmin.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'OldP@ssword1',
      });
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        'supa-1',
        { password: 'NewP@ssword1' },
      );
    });
  });
});
