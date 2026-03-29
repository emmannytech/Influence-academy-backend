import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

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
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private async getClientOrFail(supabaseId: string) {
    const client = await this.prisma.client.findFirst({
      where: { user: { supabaseId } },
    });
    if (!client) {
      throw new NotFoundException('Client profile not found');
    }
    return client;
  }

  async getCompanyProfile(supabaseId: string) {
    return this.getClientOrFail(supabaseId);
  }

  async updateCompanyProfile(supabaseId: string, dto: UpdateCompanyProfileDto) {
    const client = await this.getClientOrFail(supabaseId);

    // Validate contactEmail is a work email if provided
    if (dto.contactEmail) {
      const domain = dto.contactEmail.split('@')[1]?.toLowerCase();
      if (CONSUMER_DOMAINS.includes(domain)) {
        throw new BadRequestException(
          'Contact email must be a business email address',
        );
      }
    }

    return this.prisma.client.update({
      where: { id: client.id },
      data: dto,
    });
  }

  async getDashboard(supabaseId: string) {
    const client = await this.getClientOrFail(supabaseId);

    const statusCounts = await this.prisma.campaign.groupBy({
      by: ['status'],
      where: { clientId: client.id },
      _count: true,
    });

    const countMap: Record<string, number> = {};
    let total = 0;
    for (const entry of statusCounts) {
      countMap[entry.status] = entry._count;
      total += entry._count;
    }

    return {
      companyProfile: {
        id: client.id,
        companyName: client.companyName,
        companyType: client.companyType,
        industry: client.industry,
      },
      stats: {
        campaigns: {
          draft: countMap['draft'] ?? 0,
          submitted: countMap['submitted'] ?? 0,
          active: countMap['active'] ?? 0,
          completed: countMap['completed'] ?? 0,
          total,
        },
        pendingReviews: countMap['submitted'] ?? 0,
      },
    };
  }
}
