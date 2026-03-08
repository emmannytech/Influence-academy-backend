import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole, ClientType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findBySupabaseId(supabaseId: string) {
    return this.prisma.user.findUnique({
      where: { supabaseId },
      include: { creator: true, client: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { creator: true, client: true },
    });
  }

  async createCreator(data: { supabaseId: string; email: string }) {
    return this.prisma.user.create({
      data: {
        supabaseId: data.supabaseId,
        email: data.email,
        role: UserRole.creator,
        creator: { create: {} },
      },
      include: { creator: true },
    });
  }

  async createClient(data: {
    supabaseId: string;
    email: string;
    companyType?: ClientType;
    companyWebsite?: string;
  }) {
    return this.prisma.user.create({
      data: {
        supabaseId: data.supabaseId,
        email: data.email,
        role: UserRole.client,
        client: {
          create: {
            companyType: data.companyType,
            companyWebsite: data.companyWebsite,
          },
        },
      },
      include: { client: true },
    });
  }

  async markVerified(supabaseId: string) {
    return this.prisma.user.update({
      where: { supabaseId },
      data: { isVerified: true },
    });
  }
}
