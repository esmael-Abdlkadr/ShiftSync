import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConstraintsService } from '../constraints/constraints.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, ShiftStatus, SwapRequestStatus } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { CreateShiftDto } from './dto/create-shift.dto';
import type { UpdateShiftDto } from './dto/update-shift.dto';
import type { AssignStaffDto } from './dto/assign-staff.dto';
import type { QueryShiftsDto } from './dto/query-shifts.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly constraints: ConstraintsService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(actor: JwtPayload, query: QueryShiftsDto) {
    const { locationId, weekStart, status, skillId } = query;

    const where: any = {};

    if (actor.role === UserRole.MANAGER) {
      const managed = await this.prisma.locationManager.findMany({
        where: { userId: actor.sub },
        select: { locationId: true },
      });
      const managedIds = managed.map((m) => m.locationId);
      where.locationId = locationId
        ? managedIds.includes(locationId)
          ? locationId
          : '__none__'
        : { in: managedIds };
    } else if (locationId) {
      where.locationId = locationId;
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      where.startTime = { gte: start, lt: end };
    }

    if (status) where.status = status;
    if (skillId) where.skillId = skillId;

    return this.prisma.shift.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                hourlyRate: true,
              },
            },
            assignedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(actor: JwtPayload, dto: CreateShiftDto) {
    await this.assertLocationAccess(actor, dto.locationId);

    const shift = await this.prisma.shift.create({
      data: {
        locationId: dto.locationId,
        skillId: dto.skillId,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        headcount: dto.headcount,
        isPremium: dto.isPremium ?? false,
        editCutoffHours: dto.editCutoffHours ?? 48,
        status: ShiftStatus.DRAFT,
      },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
      },
    });

    await this.writeAuditLog(
      actor.sub,
      'CREATE',
      'Shift',
      shift.id,
      shift.locationId,
      null,
      shift,
    );
    return shift;
  }

  async update(actor: JwtPayload, id: string, dto: UpdateShiftDto) {
    const shift = await this.findOne(id);
    await this.assertLocationAccess(actor, shift.locationId);
    this.assertEditAllowed(shift);

    const before = { ...shift };
    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        ...(dto.locationId && { locationId: dto.locationId }),
        ...(dto.skillId && { skillId: dto.skillId }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
        ...(dto.headcount !== undefined && { headcount: dto.headcount }),
        ...(dto.isPremium !== undefined && { isPremium: dto.isPremium }),
        ...(dto.editCutoffHours !== undefined && {
          editCutoffHours: dto.editCutoffHours,
        }),
        version: { increment: 1 },
      },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    await this.writeAuditLog(
      actor.sub,
      'UPDATE',
      'Shift',
      id,
      shift.locationId,
      before,
      updated,
    );
    await this.cancelPendingSwapsForShift(id, shift.date);
    return updated;
  }

  private async cancelPendingSwapsForShift(shiftId: string, shiftDate: Date) {
    const pendingSwaps = await this.prisma.swapRequest.findMany({
      where: {
        shiftId,
        status: {
          in: [
            SwapRequestStatus.PENDING_PARTNER,
            SwapRequestStatus.PENDING_APPROVAL,
          ],
        },
      },
      select: { id: true, initiatorId: true, targetId: true },
    });

    if (pendingSwaps.length === 0) return;

    await this.prisma.swapRequest.updateMany({
      where: { id: { in: pendingSwaps.map((s) => s.id) } },
      data: {
        status: SwapRequestStatus.CANCELLED,
        cancelledReason: 'Shift was modified by manager.',
      },
    });

    const dateStr = shiftDate.toISOString().split('T')[0];
    for (const swap of pendingSwaps) {
      await this.notifications.notifyMany(
        [swap.initiatorId, swap.targetId],
        'SWAP_SHIFT_EDITED',
        'Swap Request Cancelled — Shift Modified',
        `Your swap request for the shift on ${dateStr} was automatically cancelled because the shift was modified by a manager.`,
        { swapId: swap.id, shiftId },
      );
    }
  }

  async remove(actor: JwtPayload, id: string) {
    const shift = await this.findOne(id);
    await this.assertLocationAccess(actor, shift.locationId);

    if (shift.status === ShiftStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot delete a published shift. Unpublish it first.',
      );
    }

    await this.prisma.shift.delete({ where: { id } });
    await this.writeAuditLog(
      actor.sub,
      'DELETE',
      'Shift',
      id,
      shift.locationId,
      shift,
      null,
    );
    return { message: 'Shift deleted successfully' };
  }

  async publish(actor: JwtPayload, id: string) {
    const shift = await this.findOne(id);
    await this.assertLocationAccess(actor, shift.locationId);

    if (shift.status === ShiftStatus.PUBLISHED) {
      throw new BadRequestException('Shift is already published.');
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.PUBLISHED, publishedAt: new Date() },
    });

    await this.writeAuditLog(
      actor.sub,
      'PUBLISH',
      'Shift',
      id,
      shift.locationId,
      { status: shift.status },
      { status: updated.status },
    );
    return updated;
  }

  async unpublish(actor: JwtPayload, id: string) {
    const shift = await this.findOne(id);
    await this.assertLocationAccess(actor, shift.locationId);

    if (shift.status === ShiftStatus.DRAFT) {
      throw new BadRequestException('Shift is already in draft.');
    }

    const hoursUntilShift =
      (shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilShift < shift.editCutoffHours) {
      throw new BadRequestException(
        `Cannot unpublish: shift starts in ${hoursUntilShift.toFixed(1)} hours, which is within the ${shift.editCutoffHours}-hour edit cutoff.`,
      );
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.DRAFT, publishedAt: null },
    });

    await this.writeAuditLog(
      actor.sub,
      'UNPUBLISH',
      'Shift',
      id,
      shift.locationId,
      { status: shift.status },
      { status: updated.status },
    );
    return updated;
  }

  async assignStaff(actor: JwtPayload, shiftId: string, dto: AssignStaffDto) {
    const shift = await this.findOne(shiftId);
    await this.assertLocationAccess(actor, shift.locationId);

    if (shift.assignments.length >= shift.headcount) {
      throw new BadRequestException(
        `This shift is already fully staffed (${shift.headcount}/${shift.headcount}).`,
      );
    }

    const constraintResult = await this.constraints.check({
      userId: dto.userId,
      shiftId,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      shiftDate: shift.date,
      locationId: shift.locationId,
      locationTimezone: shift.location.timezone,
      requiredSkillId: shift.skillId,
      overrideReason: dto.overrideReason,
      overrideNotes: dto.overrideNotes,
    });

    if (!constraintResult.ok) {
      return {
        assigned: false,
        constraintResult,
      };
    }

    try {
      const assignment = await this.prisma.$transaction(async (tx) => {
        return tx.shiftAssignment.create({
          data: {
            shiftId,
            userId: dto.userId,
            assignedById: actor.sub,
            overrideReason: dto.overrideReason ?? null,
            overrideNotes: dto.overrideNotes ?? null,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            assignedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });
      });

      await this.writeAuditLog(
        actor.sub,
        'ASSIGN_STAFF',
        'ShiftAssignment',
        assignment.id,
        shift.locationId,
        null,
        {
          shiftId,
          userId: dto.userId,
          overrideReason: dto.overrideReason,
          warnings: constraintResult.violations.filter(
            (v) => v.severity === 'warning',
          ),
        },
      );

      return { assigned: true, assignment, constraintResult };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          'This staff member is already assigned to this shift.',
        );
      }
      throw err;
    }
  }

  async removeAssignment(actor: JwtPayload, shiftId: string, userId: string) {
    const shift = await this.findOne(shiftId);
    await this.assertLocationAccess(actor, shift.locationId);

    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { shiftId, userId },
    });

    if (!assignment) throw new NotFoundException('Assignment not found.');

    await this.prisma.shiftAssignment.delete({ where: { id: assignment.id } });
    await this.writeAuditLog(
      actor.sub,
      'REMOVE_ASSIGNMENT',
      'ShiftAssignment',
      assignment.id,
      shift.locationId,
      { userId, shiftId },
      null,
    );

    return { message: 'Assignment removed successfully.' };
  }

  async getEligibleStaff(actor: JwtPayload, shiftId: string) {
    const shift = await this.findOne(shiftId);
    await this.assertLocationAccess(actor, shift.locationId);

    const assignedUserIds = shift.assignments.map((a) => a.user.id);

    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { notIn: assignedUserIds },
        skills: { some: { skillId: shift.skillId } },
        certifiedLocations: {
          some: { locationId: shift.locationId, decertifiedAt: null },
        },
      },
      include: {
        shiftAssignments: {
          include: { shift: { select: { startTime: true, endTime: true } } },
        },
      },
    });

    const weekStart = this.getWeekStart(shift.date, shift.location.timezone);
    const weekEnd = this.getWeekEnd(shift.date, shift.location.timezone);

    const result = candidates.map((candidate) => {
      const hasConflict = candidate.shiftAssignments.some((a) => {
        const s = a.shift;
        return s.startTime < shift.endTime && s.endTime > shift.startTime;
      });

      const weeklyMinutes = candidate.shiftAssignments
        .filter(
          (a) => a.shift.startTime >= weekStart && a.shift.startTime <= weekEnd,
        )
        .reduce(
          (sum, a) =>
            sum + differenceInMinutes(a.shift.endTime, a.shift.startTime),
          0,
        );

      const currentWeeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;
      const shiftMinutes = differenceInMinutes(shift.endTime, shift.startTime);
      const projectedHours =
        Math.round(((weeklyMinutes + shiftMinutes) / 60) * 10) / 10;

      return {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        hasConflict,
        currentWeeklyHours,
        projectedWeeklyHours: projectedHours,
        overtimeRisk:
          projectedHours >= 40
            ? 'high'
            : projectedHours >= 35
              ? 'medium'
              : 'low',
      };
    });

    return result.sort((a, b) => {
      if (a.hasConflict !== b.hasConflict) return a.hasConflict ? 1 : -1;
      return a.currentWeeklyHours - b.currentWeeklyHours;
    });
  }

  async getWeeklyHours(locationId: string, weekStart: string) {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        shift: {
          locationId,
          startTime: { gte: start, lt: end },
        },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    const byUser = new Map<string, { user: any; minutes: number }>();
    for (const a of assignments) {
      const existing = byUser.get(a.userId) ?? { user: a.user, minutes: 0 };
      existing.minutes += differenceInMinutes(
        a.shift.endTime,
        a.shift.startTime,
      );
      byUser.set(a.userId, existing);
    }

    return Array.from(byUser.values()).map(({ user, minutes }) => ({
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      weeklyHours: Math.round((minutes / 60) * 10) / 10,
      status:
        minutes / 60 >= 40
          ? 'overtime'
          : minutes / 60 >= 35
            ? 'near_overtime'
            : 'on_track',
    }));
  }

  private assertEditAllowed(shift: any) {
    if (shift.status === ShiftStatus.PUBLISHED && shift.publishedAt) {
      const hoursUntilShift =
        (shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilShift < shift.editCutoffHours) {
        throw new BadRequestException(
          `Cannot edit a published shift within ${shift.editCutoffHours} hours of start time.`,
        );
      }
    }
  }

  private async assertLocationAccess(actor: JwtPayload, locationId: string) {
    if (actor.role === UserRole.ADMIN) return;

    const managed = await this.prisma.locationManager.findFirst({
      where: { userId: actor.sub, locationId },
    });

    if (!managed) {
      throw new ForbiddenException('You do not manage this location.');
    }
  }

  private getWeekStart(date: Date, tz: string): Date {
    const zoned = toZonedTime(date, tz);
    const day = zoned.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(zoned);
    monday.setDate(zoned.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const { fromZonedTime } = require('date-fns-tz');
    return fromZonedTime(monday, tz);
  }

  private getWeekEnd(date: Date, tz: string): Date {
    const weekStart = this.getWeekStart(date, tz);
    const { fromZonedTime } = require('date-fns-tz');
    const zoned = toZonedTime(weekStart, tz);
    zoned.setDate(zoned.getDate() + 6);
    zoned.setHours(23, 59, 59, 999);
    return fromZonedTime(zoned, tz);
  }

  private async writeAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    locationId: string,
    before: any,
    after: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        locationId,
        beforeState: before ?? undefined,
        afterState: after ?? undefined,
      },
    });
  }
}
