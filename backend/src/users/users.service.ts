import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  SetAvailabilityDto,
  CreateExceptionDto,
} from './dto/set-availability.dto';
import type { ImportUserRowDto } from './dto/import-users.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface ImportRowResult {
  row: number;
  email: string;
  reason: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(
    currentUserId: string,
    currentUserRole: UserRole,
    query: QueryUsersDto,
  ) {
    const { search, role, locationId, skillId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (locationId) {
      where.certifiedLocations = {
        some: { locationId, decertifiedAt: null },
      };
    }

    if (skillId) {
      where.skills = { some: { skillId } };
    }

    if (currentUserRole === UserRole.MANAGER) {
      const managedLocations = await this.prisma.locationManager.findMany({
        where: { userId: currentUserId },
        select: { locationId: true },
      });
      const managedLocationIds = managedLocations.map((l) => l.locationId);

      where.OR = [
        {
          certifiedLocations: {
            some: { locationId: { in: managedLocationIds } },
          },
        },
        { id: currentUserId },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          timezone: true,
          desiredWeeklyHours: true,
          hourlyRate: true,
          isActive: true,
          createdAt: true,
          skills: {
            include: { skill: true },
          },
          certifiedLocations: {
            where: { decertifiedAt: null },
            include: { location: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        timezone: true,
        desiredWeeklyHours: true,
        hourlyRate: true,
        isActive: true,
        notificationPreference: true,
        createdAt: true,
        updatedAt: true,
        skills: {
          include: { skill: true },
        },
        certifiedLocations: {
          include: { location: true },
        },
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
        availabilityExceptions: {
          where: {
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
    dto: UpdateUserDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (currentUserRole !== UserRole.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (dto.role && currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        timezone: true,
        desiredWeeklyHours: true,
        hourlyRate: true,
        isActive: true,
        notificationPreference: true,
      },
    });
  }

  async softDelete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, isActive: true },
      });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot deactivate the last admin user');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserSkills(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });
  }

  async assignSkill(userId: string, skillId: string) {
    const [user, skill] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.skill.findUnique({ where: { id: skillId } }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${skillId} not found`);
    }

    return this.prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      update: {},
      create: { userId, skillId },
      include: { skill: true },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });

    if (!userSkill) {
      throw new NotFoundException(`User does not have this skill assigned`);
    }

    await this.prisma.userSkill.delete({
      where: { userId_skillId: { userId, skillId } },
    });

    return { message: 'Skill removed successfully' };
  }

  async getUserCertifications(userId: string, includeDecertified = false) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const where: Prisma.UserLocationCertificationWhereInput = { userId };
    if (!includeDecertified) {
      where.decertifiedAt = null;
    }

    return this.prisma.userLocationCertification.findMany({
      where,
      include: { location: true },
    });
  }

  async certifyLocation(userId: string, locationId: string) {
    const [user, location] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.location.findUnique({ where: { id: locationId } }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    const existing = await this.prisma.userLocationCertification.findUnique({
      where: { userId_locationId: { userId, locationId } },
    });

    if (existing && !existing.decertifiedAt) {
      throw new ConflictException(
        `User is already certified for this location`,
      );
    }

    if (existing) {
      return this.prisma.userLocationCertification.update({
        where: { userId_locationId: { userId, locationId } },
        data: { decertifiedAt: null },
        include: { location: true },
      });
    }

    return this.prisma.userLocationCertification.create({
      data: { userId, locationId },
      include: { location: true },
    });
  }

  async decertifyLocation(userId: string, locationId: string) {
    const certification =
      await this.prisma.userLocationCertification.findUnique({
        where: { userId_locationId: { userId, locationId } },
      });

    if (!certification) {
      throw new NotFoundException(`User is not certified for this location`);
    }

    if (certification.decertifiedAt) {
      throw new ConflictException(
        `User is already decertified from this location`,
      );
    }

    return this.prisma.userLocationCertification.update({
      where: { userId_locationId: { userId, locationId } },
      data: { decertifiedAt: new Date() },
      include: { location: true },
    });
  }

  async recertifyLocation(userId: string, locationId: string) {
    const certification =
      await this.prisma.userLocationCertification.findUnique({
        where: { userId_locationId: { userId, locationId } },
      });

    if (!certification) {
      throw new NotFoundException(
        `User has never been certified for this location`,
      );
    }

    if (!certification.decertifiedAt) {
      throw new ConflictException(
        `User is already certified for this location`,
      );
    }

    return this.prisma.userLocationCertification.update({
      where: { userId_locationId: { userId, locationId } },
      data: { decertifiedAt: null },
      include: { location: true },
    });
  }

  async getAvailability(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.availability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setAvailability(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    dto: SetAvailabilityDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (currentUserRole === UserRole.STAFF && currentUserId !== userId) {
      throw new ForbiddenException(
        'Staff can only update their own availability',
      );
    }

    const daysSeen = new Set<string>();
    for (const slot of dto.availability) {
      if (daysSeen.has(slot.dayOfWeek)) {
        throw new BadRequestException(
          `Duplicate availability for ${slot.dayOfWeek}`,
        );
      }
      daysSeen.add(slot.dayOfWeek);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { userId } });

      if (dto.availability.length > 0) {
        await tx.availability.createMany({
          data: dto.availability.map((slot) => ({
            userId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });
      }
    });

    // Notify managers at all locations this staff member is certified for
    await this.notifyManagersOfAvailabilityChange(
      userId,
      user.firstName,
      user.lastName,
    );

    return this.getAvailability(userId);
  }

  async getAvailabilityExceptions(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.availabilityException.findMany({
      where: {
        userId,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
    });
  }

  async addAvailabilityException(
    userId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    dto: CreateExceptionDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (currentUserRole === UserRole.STAFF && currentUserId !== userId) {
      throw new ForbiddenException(
        'Staff can only update their own availability',
      );
    }

    if (dto.isAvailable && (!dto.startTime || !dto.endTime)) {
      throw new BadRequestException(
        'Start time and end time are required when marking as available',
      );
    }

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const existing = await this.prisma.availabilityException.findUnique({
      where: { userId_date: { userId, date } },
    });

    const dateStr = date.toISOString().split('T')[0];
    const availability = dto.isAvailable ? 'available' : 'unavailable';

    const exception = existing
      ? await this.prisma.availabilityException.update({
          where: { userId_date: { userId, date } },
          data: {
            isAvailable: dto.isAvailable,
            startTime: dto.isAvailable ? dto.startTime : null,
            endTime: dto.isAvailable ? dto.endTime : null,
            reason: dto.reason,
          },
        })
      : await this.prisma.availabilityException.create({
          data: {
            userId,
            date,
            isAvailable: dto.isAvailable,
            startTime: dto.isAvailable ? dto.startTime : null,
            endTime: dto.isAvailable ? dto.endTime : null,
            reason: dto.reason,
          },
        });

    // Notify managers: staff marked themselves unavailable/available for a specific date
    await this.notifyManagersOfAvailabilityChange(
      userId,
      user.firstName,
      user.lastName,
      `${user.firstName} ${user.lastName} has marked themselves ${availability} on ${dateStr}.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
    );

    return exception;
  }

  async removeAvailabilityException(
    userId: string,
    exceptionId: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ) {
    const exception = await this.prisma.availabilityException.findUnique({
      where: { id: exceptionId },
    });

    if (!exception) {
      throw new NotFoundException(`Exception not found`);
    }

    if (exception.userId !== userId) {
      throw new BadRequestException('Exception does not belong to this user');
    }

    if (currentUserRole === UserRole.STAFF && currentUserId !== userId) {
      throw new ForbiddenException(
        'Staff can only update their own availability',
      );
    }

    await this.prisma.availabilityException.delete({
      where: { id: exceptionId },
    });

    return { message: 'Exception removed successfully' };
  }

  async importUsers(rows: ImportUserRowDto[]): Promise<{
    succeeded: number;
    failed: number;
    errors: ImportRowResult[];
  }> {
    const defaultPassword = 'Welcome123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const errors: ImportRowResult[] = [];
    let succeeded = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2: 1-indexed + header row

      try {
        const existing = await this.prisma.user.findUnique({
          where: { email: row.email.toLowerCase() },
        });

        if (existing) {
          // Update existing user instead of failing
          await this.prisma.user.update({
            where: { email: row.email.toLowerCase() },
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              role: row.role,
              timezone: row.timezone ?? existing.timezone,
              desiredWeeklyHours:
                row.desiredWeeklyHours ?? existing.desiredWeeklyHours,
              hourlyRate:
                row.hourlyRate !== undefined
                  ? row.hourlyRate
                  : existing.hourlyRate,
              isActive: true,
            },
          });
          succeeded++;
        } else {
          await this.prisma.user.create({
            data: {
              email: row.email.toLowerCase(),
              firstName: row.firstName,
              lastName: row.lastName,
              role: row.role,
              passwordHash,
              timezone: row.timezone ?? 'America/New_York',
              desiredWeeklyHours: row.desiredWeeklyHours,
              hourlyRate: row.hourlyRate,
              isActive: true,
            },
          });
          succeeded++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNum, email: row.email, reason: message });
      }
    }

    return { succeeded, failed: errors.length, errors };
  }

  private async notifyManagersOfAvailabilityChange(
    userId: string,
    firstName: string,
    lastName: string,
    customMessage?: string,
  ): Promise<void> {
    const certs = await this.prisma.userLocationCertification.findMany({
      where: { userId, decertifiedAt: null },
      select: { locationId: true },
    });
    const locationIds = certs.map((c) => c.locationId);
    if (locationIds.length === 0) return;

    const managers = await this.prisma.locationManager.findMany({
      where: { locationId: { in: locationIds }, userId: { not: userId } },
      select: { userId: true },
    });
    const managerIds = [...new Set(managers.map((m) => m.userId))];
    if (managerIds.length === 0) return;

    const message =
      customMessage ??
      `${firstName} ${lastName} has updated their weekly availability. You may want to review upcoming schedules.`;

    await this.notifications.notifyMany(
      managerIds,
      'AVAILABILITY_CHANGED',
      'Staff Availability Updated',
      message,
      { userId },
    );
  }
}
