import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SetupCategory } from '../common/enums';
import { toSlug } from '../common/utils/slug';

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const select = {
      id: true,
      label: true,
      value: true,
      sortOrder: true,
    };

    const where = { isActive: true };
    const orderBy = { sortOrder: 'asc' as const };

    const [countries, niches, platforms, industries] = await Promise.all([
      this.prisma.setupItem.findMany({
        where: { ...where, category: SetupCategory.COUNTRY },
        orderBy,
        select,
      }),
      this.prisma.setupItem.findMany({
        where: { ...where, category: SetupCategory.NICHE },
        orderBy,
        select,
      }),
      this.prisma.setupItem.findMany({
        where: { ...where, category: SetupCategory.PLATFORM },
        orderBy,
        select,
      }),
      this.prisma.setupItem.findMany({
        where: { ...where, category: SetupCategory.INDUSTRY },
        orderBy,
        select,
      }),
    ]);

    return { countries, niches, platforms, industries };
  }

  async findByCategory(category: SetupCategory) {
    const select: Record<string, any> = {
      id: true,
      label: true,
      value: true,
      sortOrder: true,
    };

    if (category === SetupCategory.CITY) {
      select.parent = {
        select: { id: true, label: true, value: true },
      };
    }

    return this.prisma.setupItem.findMany({
      where: { category, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select,
    });
  }

  async findOrCreateCity(countryInput: string, cityLabel: string) {
    const normalizedLabel = cityLabel.trim();
    if (!normalizedLabel) return;

    const slugValue = toSlug(countryInput);

    // Look up by value (slug) or label (case-insensitive) to handle both formats
    const country = await this.prisma.setupItem.findFirst({
      where: {
        category: SetupCategory.COUNTRY,
        isActive: true,
        OR: [
          { value: slugValue },
          { label: { equals: countryInput, mode: 'insensitive' } },
        ],
      },
    });

    if (!country) return;

    const cityValue = toSlug(normalizedLabel);

    const existing = await this.prisma.setupItem.findFirst({
      where: {
        category: SetupCategory.CITY,
        parentId: country.id,
        value: cityValue,
      },
    });

    if (existing) return;

    // Get max sortOrder for this country's cities to append at end
    const lastCity = await this.prisma.setupItem.findFirst({
      where: { category: SetupCategory.CITY, parentId: country.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    try {
      await this.prisma.setupItem.create({
        data: {
          category: SetupCategory.CITY,
          label: normalizedLabel,
          value: cityValue,
          parentId: country.id,
          sortOrder: (lastCity?.sortOrder ?? 0) + 10,
        },
      });
    } catch (error) {
      // P2002 = unique constraint violation — concurrent insert already created the city
      if (error?.code === 'P2002') return;
      throw error;
    }
  }

  async findCitiesByCountry(countryValue: string) {
    const country = await this.prisma.setupItem.findFirst({
      where: {
        category: SetupCategory.COUNTRY,
        value: countryValue,
        isActive: true,
      },
    });

    if (!country) {
      throw new NotFoundException(`Country '${countryValue}' not found`);
    }

    return this.prisma.setupItem.findMany({
      where: {
        category: SetupCategory.CITY,
        parentId: country.id,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        label: true,
        value: true,
        sortOrder: true,
      },
    });
  }
}
