import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { QueryAuditDto } from './dto/query-audit.dto';

const ACTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

const LOCATION_SELECT = {
  id: true,
  name: true,
} as const;

const AUDIT_INCLUDE = {
  user: { select: ACTOR_SELECT },
  location: { select: LOCATION_SELECT },
} as const;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.locationId) where.locationId = query.locationId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.actorId) where.userId = query.actorId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: AUDIT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, entries };
  }

  async findByShift(shiftId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { shiftId },
          { entityId: shiftId, entityType: 'Shift' },
          { entityId: shiftId, entityType: 'ShiftAssignment' },
        ],
      },
      include: AUDIT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async exportAll(query: QueryAuditDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.locationId) where.locationId = query.locationId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.actorId) where.userId = query.actorId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    return this.prisma.auditLog.findMany({
      where,
      include: AUDIT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
