import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRole } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, userRole: UserRole) {
    if (userRole === 'ADMIN') {
      return this.prisma.location.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { 
              managers: true,
              certifiedStaff: true,
              shifts: true,
            },
          },
        },
      });
    }

    if (userRole === 'MANAGER') {
      return this.prisma.location.findMany({
        where: {
          managers: {
            some: { userId },
          },
        },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { 
              managers: true,
              certifiedStaff: true,
              shifts: true,
            },
          },
        },
      });
    }

    return this.prisma.location.findMany({
      where: {
        certifiedStaff: {
          some: { 
            userId,
            decertifiedAt: null,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        managers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        certifiedStaff: {
          where: { decertifiedAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { shifts: true },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }
}
