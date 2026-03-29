import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { AdminClientQueryDto } from './dto/admin-client-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class AdminClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AdminClientQueryDto) {
    const {
      page = 1,
      pageSize = 20,
      sortBy,
      sortOrder,
      search,
      companyType,
      industry,
      country,
    } = query;

    const where: Prisma.ClientWhereInput = {};
    if (companyType) where.companyType = companyType;
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPersonName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ClientOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'desc' }
      : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { email: true, isVerified: true } },
          _count: { select: { campaigns: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return new PaginatedResponseDto(items, total, page, pageSize);
  }

  async findOne(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: { select: { email: true, isVerified: true, createdAt: true } },
        _count: { select: { campaigns: true } },
      },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }
}
