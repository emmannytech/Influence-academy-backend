import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { MarketplaceCreatorQueryDto } from './dto/marketplace-creator-query.dto';
import { MarketplaceCampaignQueryDto } from './dto/marketplace-campaign-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async findCreators(query: MarketplaceCreatorQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      search,
      country,
      city,
      platform,
      niche,
    } = query;

    const where: Prisma.CreatorWhereInput = {
      status: 'approved',
    };

    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (niche) where.niches = { has: niche };
    if (platform) {
      where.socialHandles = { path: [platform], not: Prisma.DbNull };
    }
    if (search) {
      where.AND = [
        (where.AND as Prisma.CreatorWhereInput) ?? {},
        {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { bio: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { niches: { has: search } },
          ],
        },
      ];
    }

    const orderBy: Prisma.CreatorOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          country: true,
          city: true,
          bio: true,
          niches: true,
          socialHandles: true,
          profilePicture: true,
          createdAt: true,
        },
      }),
      this.prisma.creator.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOneCreator(creatorId: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { id: creatorId, status: 'approved' },
      select: {
        id: true,
        fullName: true,
        country: true,
        city: true,
        location: true,
        bio: true,
        niches: true,
        socialHandles: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator;
  }

  async findCampaigns(query: MarketplaceCampaignQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      search,
      platform,
    } = query;

    const where: Prisma.CampaignWhereInput = {
      status: 'active',
    };

    if (platform) where.platforms = { has: platform };
    if (search) {
      where.AND = [
        (where.AND as Prisma.CampaignWhereInput) ?? {},
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const orderBy: Prisma.CampaignOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          platforms: true,
          numberOfCreators: true,
          budget: true,
          timeline: true,
          coverImage: true,
          status: true,
          createdAt: true,
          client: {
            select: { companyName: true, companyType: true },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }
}
