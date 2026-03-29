import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SetupCategory } from '../common/enums';
import { CreateSetupItemDto } from './dto/create-setup-item.dto';
import { UpdateSetupItemDto } from './dto/update-setup-item.dto';
import { ReorderSetupItemsDto } from './dto/reorder-setup-items.dto';
import { toSlug } from '../common/utils/slug';

@Injectable()
export class AdminSetupService {
  constructor(private prisma: PrismaService) {}

  async findByCategory(category: SetupCategory) {
    if (category === SetupCategory.CITY) {
      return this.prisma.setupItem.findMany({
        where: { category },
        orderBy: { sortOrder: 'asc' },
        include: {
          parent: { select: { id: true, label: true, value: true } },
        },
      });
    }

    if (category === SetupCategory.COUNTRY) {
      return this.prisma.setupItem.findMany({
        where: { category },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { children: true } } },
      });
    }

    return this.prisma.setupItem.findMany({
      where: { category },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(category: SetupCategory, dto: CreateSetupItemDto) {
    const value = dto.value || toSlug(dto.label);

    if (category === SetupCategory.CITY) {
      if (!dto.parentId) {
        throw new BadRequestException(
          'parentId is required when creating a city',
        );
      }

      const parent = await this.prisma.setupItem.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.category !== SetupCategory.COUNTRY) {
        throw new BadRequestException(
          'parentId must reference an existing country',
        );
      }
    } else if (dto.parentId) {
      throw new BadRequestException('parentId is only valid for city category');
    }

    try {
      return await this.prisma.setupItem.create({
        data: {
          category,
          label: dto.label,
          value,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
          parentId: dto.parentId ?? null,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A setup item with this value already exists in this category',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSetupItemDto) {
    const item = await this.prisma.setupItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Setup item not found');
    }

    // Validate parentId changes
    if (dto.parentId !== undefined) {
      if (item.category !== SetupCategory.CITY) {
        throw new BadRequestException('parentId can only be set on cities');
      }
      if (dto.parentId !== null) {
        const parent = await this.prisma.setupItem.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent || parent.category !== SetupCategory.COUNTRY) {
          throw new BadRequestException(
            'parentId must reference an existing country',
          );
        }
      }
    }

    try {
      return await this.prisma.setupItem.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A setup item with this value already exists in this category',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    const item = await this.prisma.setupItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Setup item not found');
    }

    // Cascade soft-delete: deactivate country → deactivate its cities
    if (item.category === SetupCategory.COUNTRY) {
      const [deactivated] = await this.prisma.$transaction([
        this.prisma.setupItem.update({
          where: { id },
          data: { isActive: false },
        }),
        this.prisma.setupItem.updateMany({
          where: { parentId: id },
          data: { isActive: false },
        }),
      ]);
      return deactivated;
    }

    return this.prisma.setupItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reorder(category: SetupCategory, dto: ReorderSetupItemsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.setupItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { message: 'Items reordered successfully' };
  }

  async findCitiesByCountry(countryId: string) {
    const country = await this.prisma.setupItem.findUnique({
      where: { id: countryId },
    });

    if (!country || country.category !== SetupCategory.COUNTRY) {
      throw new NotFoundException('Country not found');
    }

    return this.prisma.setupItem.findMany({
      where: { parentId: countryId, category: SetupCategory.CITY },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
