import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatorStatus } from '@prisma/client';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { SetupService } from '../setup/setup.service';

const CREATOR_PUBLIC_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  dateOfBirth: true,
  country: true,
  city: true,
  location: true,
  contactNumber: true,
  email: true,
  bio: true,
  niches: true,
  socialHandles: true,
  profilePicture: true,
  status: true,
  rejectionReason: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    private prisma: PrismaService,
    private setupService: SetupService,
  ) {}

  private async getCreatorOrFail(supabaseId: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { user: { supabaseId } },
    });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }
    return creator;
  }

  async getProfile(supabaseId: string) {
    const creator = await this.getCreatorOrFail(supabaseId);
    return this.prisma.creator.findUniqueOrThrow({
      where: { id: creator.id },
      select: CREATOR_PUBLIC_SELECT,
    });
  }

  async updateProfile(supabaseId: string, dto: UpdateCreatorProfileDto) {
    const creator = await this.getCreatorOrFail(supabaseId);

    if (
      creator.status !== CreatorStatus.draft &&
      creator.status !== CreatorStatus.rejected &&
      creator.status !== CreatorStatus.approved
    ) {
      throw new BadRequestException(
        'Profile cannot be edited in current status',
      );
    }

    const updated = await this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        socialHandles: dto.socialHandles ? { ...dto.socialHandles } : undefined,
      },
      select: CREATOR_PUBLIC_SELECT,
    });

    // Auto-create city setup item if it doesn't exist
    const country = dto.country ?? creator.country;
    const city = dto.city ?? creator.city;
    if (country && city) {
      this.setupService.findOrCreateCity(country, city).catch((err) => {
        this.logger.warn(
          `Failed to auto-create city setup item: ${err.message}`,
        );
      });
    }

    return updated;
  }

  async submitProfile(supabaseId: string) {
    const creator = await this.getCreatorOrFail(supabaseId);

    if (
      creator.status !== CreatorStatus.draft &&
      creator.status !== CreatorStatus.rejected
    ) {
      throw new BadRequestException(
        'Profile can only be submitted from draft or rejected status',
      );
    }

    // Validate required fields
    const missing: string[] = [];
    if (!creator.fullName) missing.push('fullName');
    if (!creator.dateOfBirth) missing.push('dateOfBirth');
    if (!creator.country) missing.push('country');
    if (!creator.city) missing.push('city');
    if (!creator.location) missing.push('location');
    if (!creator.contactNumber) missing.push('contactNumber');
    if (!creator.email) missing.push('email');

    const handles = creator.socialHandles as Record<string, string> | null;
    if (!handles?.instagram) missing.push('socialHandles.instagram');
    if (!handles?.tiktok) missing.push('socialHandles.tiktok');
    if (!handles?.x) missing.push('socialHandles.x');
    if (!handles?.youtube) missing.push('socialHandles.youtube');

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Missing required fields for submission',
        details: { missingFields: missing },
      });
    }

    return this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        status: CreatorStatus.submitted,
        submittedAt: new Date(),
      },
      select: CREATOR_PUBLIC_SELECT,
    });
  }

  async reopenDraft(supabaseId: string) {
    const creator = await this.getCreatorOrFail(supabaseId);

    if (creator.status !== CreatorStatus.rejected) {
      throw new BadRequestException(
        'Only rejected profiles can be reopened as draft',
      );
    }

    return this.prisma.creator.update({
      where: { id: creator.id },
      data: {
        status: CreatorStatus.draft,
        rejectionReason: null,
      },
      select: CREATOR_PUBLIC_SELECT,
    });
  }

  async getDashboard(supabaseId: string) {
    const creator = await this.getCreatorOrFail(supabaseId);

    const [pending, accepted, declined, activeCampaigns] = await Promise.all([
      this.prisma.invitation.count({
        where: { creatorId: creator.id, status: 'pending' },
      }),
      this.prisma.invitation.count({
        where: { creatorId: creator.id, status: 'accepted' },
      }),
      this.prisma.invitation.count({
        where: { creatorId: creator.id, status: 'declined' },
      }),
      this.prisma.invitation.count({
        where: {
          creatorId: creator.id,
          status: 'accepted',
          campaign: { status: 'active' },
        },
      }),
    ]);

    return {
      profile: {
        id: creator.id,
        fullName: creator.fullName,
        status: creator.status,
        submittedAt: creator.submittedAt,
      },
      stats: {
        invitations: { pending, accepted, declined },
        campaigns: activeCampaigns,
      },
    };
  }
}
