import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConstraintsService } from '../constraints/constraints.service';
import { EventsService } from '../events/events.service';
import {
  DropRequestStatus,
  Prisma,
  SwapRequestStatus,
  UserRole,
} from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { CreateDropRequestDto } from './dto/create-drop-request.dto';
import type { ReviewDropDto } from './dto/review-drop.dto';
import type { QueryDropsDto } from './dto/query-drops.dto';

const DROP_INCLUDE = {
  shift: {
    include: {
      location: { select: { id: true, name: true, timezone: true } },
      requiredSkill: { select: { id: true, name: true } },
    },
  },
  requestor: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  claimer: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  manager: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.DropRequestInclude;

type DropWithRelations = Prisma.DropRequestGetPayload<{
  include: typeof DROP_INCLUDE;
}>;

@Injectable()
export class DropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly constraints: ConstraintsService,
    private readonly events: EventsService,
  ) {}

  async findAll(actor: JwtPayload, query: QueryDropsDto) {
    const where: Prisma.DropRequestWhereInput = {};

    if (query.status) where.status = query.status;

    if (actor.role === UserRole.STAFF) {
      where.requestorId = actor.sub;
    } else if (actor.role === UserRole.MANAGER) {
      const managed = await this.prisma.locationManager.findMany({
        where: { userId: actor.sub },
        select: { locationId: true },
      });
      const locationIds = managed.map((m) => m.locationId);
      if (query.locationId) {
        where.shift = locationIds.includes(query.locationId)
          ? { locationId: query.locationId }
          : { locationId: { in: [] } };
      } else {
        where.shift = { locationId: { in: locationIds } };
      }
    } else if (query.locationId) {
      where.shift = { locationId: query.locationId };
    }

    return this.prisma.dropRequest.findMany({
      where,
      include: DROP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenDrops(actor: JwtPayload) {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId: actor.sub },
      select: { skillId: true },
    });
    const userCerts = await this.prisma.userLocationCertification.findMany({
      where: { userId: actor.sub, decertifiedAt: null },
      select: { locationId: true },
    });

    const skillIds = userSkills.map((s) => s.skillId);
    const locationIds = userCerts.map((c) => c.locationId);

    return this.prisma.dropRequest.findMany({
      where: {
        status: DropRequestStatus.OPEN,
        requestorId: { not: actor.sub },
        expiresAt: { gt: new Date() },
        shift: {
          skillId: { in: skillIds },
          locationId: { in: locationIds },
          startTime: { gt: new Date() },
        },
      },
      include: DROP_INCLUDE,
      orderBy: { expiresAt: 'asc' },
    });
  }

  async createDropRequest(actor: JwtPayload, dto: CreateDropRequestDto) {
    if (actor.role !== UserRole.STAFF) {
      throw new ForbiddenException(
        'Only staff members can create drop requests.',
      );
    }

    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: {
        location: { select: { id: true, name: true, timezone: true } },
        requiredSkill: { select: { id: true, name: true } },
        assignments: true,
      },
    });
    if (!shift) throw new NotFoundException('Shift not found.');
    if (shift.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Shift must be published before creating a drop request.',
      );
    }

    const isAssigned = shift.assignments.some((a) => a.userId === actor.sub);
    if (!isAssigned) {
      throw new BadRequestException('You are not assigned to this shift.');
    }

    const existingDrop = await this.prisma.dropRequest.findFirst({
      where: {
        shiftId: dto.shiftId,
        requestorId: actor.sub,
        status: {
          in: [DropRequestStatus.OPEN, DropRequestStatus.CLAIMED_PENDING],
        },
      },
    });
    if (existingDrop) {
      throw new BadRequestException(
        'You already have an active drop request for this shift.',
      );
    }

    await this.assertUnderPendingLimit(actor.sub);

    const expiresAt = new Date(shift.startTime.getTime() - 24 * 60 * 60 * 1000);
    if (expiresAt <= new Date()) {
      throw new BadRequestException(
        'Drop requests cannot be created within 24 hours of the shift start time.',
      );
    }

    const drop = await this.prisma.dropRequest.create({
      data: {
        shiftId: dto.shiftId,
        requestorId: actor.sub,
        status: DropRequestStatus.OPEN,
        expiresAt,
      },
      include: DROP_INCLUDE,
    });

    const managers = await this.prisma.locationManager.findMany({
      where: { locationId: shift.locationId },
      select: { userId: true },
    });
    for (const mgr of managers) {
      await this.notifications.notify(
        mgr.userId,
        'DROP_CREATED',
        'Staff Drop Request',
        `${drop.requestor.firstName} ${drop.requestor.lastName} has dropped their shift on ${shift.date.toISOString().split('T')[0]}. It is now open for eligible staff to claim.`,
        { dropId: drop.id, shiftId: shift.id },
      );
    }

    this.events.emitToLocation(shift.locationId, 'drop:created', { dropId: drop.id });

    return drop;
  }

  async claimDrop(actor: JwtPayload, dropId: string) {
    if (actor.role !== UserRole.STAFF) {
      throw new ForbiddenException(
        'Only staff members can claim drop requests.',
      );
    }

    const drop = await this.getDropOrThrow(dropId);

    if (drop.requestorId === actor.sub) {
      throw new BadRequestException('You cannot claim your own drop request.');
    }
    if (drop.status !== DropRequestStatus.OPEN) {
      throw new BadRequestException(
        `Cannot claim a drop in status "${drop.status}".`,
      );
    }
    if (drop.expiresAt <= new Date()) {
      throw new BadRequestException('This drop request has expired.');
    }

    const constraintResult = await this.constraints.check({
      userId: actor.sub,
      shiftId: drop.shiftId,
      shiftStart: drop.shift.startTime,
      shiftEnd: drop.shift.endTime,
      shiftDate: drop.shift.date,
      locationId: drop.shift.locationId,
      locationTimezone: drop.shift.location.timezone,
      requiredSkillId: drop.shift.skillId,
    });

    if (!constraintResult.ok) {
      throw new BadRequestException({
        message: 'You cannot claim this shift due to scheduling constraints.',
        violations: constraintResult.violations,
        suggestions: constraintResult.suggestions,
      });
    }

    const updated = await this.prisma.dropRequest.update({
      where: { id: dropId },
      data: {
        status: DropRequestStatus.CLAIMED_PENDING,
        claimerId: actor.sub,
        claimedAt: new Date(),
      },
      include: DROP_INCLUDE,
    });

    // Notify managers: approval needed
    const managers = await this.prisma.locationManager.findMany({
      where: { locationId: drop.shift.locationId },
      select: { userId: true },
    });
    for (const mgr of managers) {
      await this.notifications.notify(
        mgr.userId,
        'DROP_CLAIMED',
        'Drop Request Claimed — Approval Needed',
        `${updated.claimer!.firstName} ${updated.claimer!.lastName} wants to claim the shift dropped by ${drop.requestor.firstName} ${drop.requestor.lastName} on ${drop.shift.date.toISOString().split('T')[0]}. Your approval is required.`,
        { dropId, shiftId: drop.shiftId },
      );
    }

    // Notify the original requestor: their shift was claimed and awaiting approval
    await this.notifications.notify(
      drop.requestorId,
      'DROP_CLAIMED',
      'Your Dropped Shift Was Claimed',
      `${updated.claimer!.firstName} ${updated.claimer!.lastName} has claimed your dropped shift on ${drop.shift.date.toISOString().split('T')[0]}. Waiting for manager approval.`,
      { dropId, shiftId: drop.shiftId },
    );

    return updated;
  }

  async managerReviewDrop(
    actor: JwtPayload,
    dropId: string,
    dto: ReviewDropDto,
  ) {
    const drop = await this.getDropOrThrow(dropId);

    if (drop.status !== DropRequestStatus.CLAIMED_PENDING) {
      throw new BadRequestException(
        `Cannot review a drop in status "${drop.status}".`,
      );
    }

    if (actor.role === UserRole.MANAGER) {
      const manages = await this.prisma.locationManager.findFirst({
        where: { userId: actor.sub, locationId: drop.shift.locationId },
      });
      if (!manages)
        throw new ForbiddenException(
          "You do not manage this shift's location.",
        );
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only managers or admins can review drop requests.',
      );
    }

    if (!dto.approve) {
      const updated = await this.prisma.dropRequest.update({
        where: { id: dropId },
        data: {
          status: DropRequestStatus.OPEN,
          claimerId: null,
          claimedAt: null,
          managerReviewedAt: new Date(),
          managerId: actor.sub,
          managerNotes: dto.notes ?? null,
        },
        include: DROP_INCLUDE,
      });
      await this.writeAuditLog(
        actor.sub,
        'REJECT_DROP',
        'DropRequest',
        dropId,
        drop.shiftId,
        drop,
        updated,
      );
      if (drop.claimerId) {
        // Notify claimer: their claim was rejected
        await this.notifications.notify(
          drop.claimerId,
          'DROP_CLAIM_REJECTED',
          'Drop Claim Rejected',
          `Your claim for the shift on ${drop.shift.date.toISOString().split('T')[0]} was rejected by the manager.${dto.notes ? ` Reason: ${dto.notes}` : ''} The shift is still open for others to claim.`,
          { dropId },
        );
        // Notify requestor: their drop is back to OPEN
        await this.notifications.notify(
          drop.requestorId,
          'DROP_CLAIM_REJECTED',
          'Drop Claim Was Rejected — Still Open',
          `The manager rejected ${drop.claimer!.firstName} ${drop.claimer!.lastName}'s claim for your dropped shift on ${drop.shift.date.toISOString().split('T')[0]}. Your drop request is still open.${dto.notes ? ` Manager note: ${dto.notes}` : ''}`,
          { dropId },
        );
      }
      return updated;
    }

    if (!drop.claimerId) {
      throw new BadRequestException('No claimer found for this drop request.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.shiftAssignment.deleteMany({
        where: { shiftId: drop.shiftId, userId: drop.requestorId },
      });

      await tx.shiftAssignment.create({
        data: {
          shiftId: drop.shiftId,
          userId: drop.claimerId!,
          assignedById: actor.sub,
        },
      });

      return tx.dropRequest.update({
        where: { id: dropId },
        data: {
          status: DropRequestStatus.APPROVED,
          managerReviewedAt: new Date(),
          managerId: actor.sub,
          managerNotes: dto.notes ?? null,
        },
        include: DROP_INCLUDE,
      });
    });

    await this.writeAuditLog(
      actor.sub,
      'APPROVE_DROP',
      'DropRequest',
      dropId,
      drop.shiftId,
      drop,
      updated,
    );
    await this.notifications.notifyMany(
      [drop.requestorId, drop.claimerId],
      'DROP_APPROVED',
      'Drop Request Approved',
      `The shift drop for ${drop.shift.date.toISOString().split('T')[0]} has been approved. ${updated.claimer!.firstName} ${updated.claimer!.lastName} is now assigned to the shift.`,
      { dropId },
    );
    this.events.emitToUser(drop.requestorId, 'drop:resolved', {
      dropId,
      status: 'APPROVED',
    });
    if (drop.claimerId) {
      this.events.emitToUser(drop.claimerId, 'drop:resolved', {
        dropId,
        status: 'APPROVED',
      });
    }

    return updated;
  }

  async cancelDrop(actor: JwtPayload, dropId: string) {
    const drop = await this.getDropOrThrow(dropId);

    if (drop.requestorId !== actor.sub && actor.role === UserRole.STAFF) {
      throw new ForbiddenException(
        'Only the requestor can cancel a drop request.',
      );
    }

    if (
      !(
        [
          DropRequestStatus.OPEN,
          DropRequestStatus.CLAIMED_PENDING,
        ] as DropRequestStatus[]
      ).includes(drop.status)
    ) {
      throw new BadRequestException(
        `Cannot cancel a drop in status "${drop.status}".`,
      );
    }

    const updated = await this.prisma.dropRequest.update({
      where: { id: dropId },
      data: { status: DropRequestStatus.CANCELLED },
      include: DROP_INCLUDE,
    });

    if (drop.status === DropRequestStatus.CLAIMED_PENDING && drop.claimerId) {
      await this.notifications.notify(
        drop.claimerId,
        'DROP_CANCELLED',
        'Drop Request Cancelled',
        `${drop.requestor.firstName} ${drop.requestor.lastName} cancelled their drop request for the shift on ${drop.shift.date.toISOString().split('T')[0]}. Your claim has been voided.`,
        { dropId },
      );
    }

    this.events.emitToLocation(drop.shift.locationId, 'drop:cancelled', { dropId });

    return updated;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleDrops() {
    const stale = await this.prisma.dropRequest.findMany({
      where: {
        status: {
          in: [DropRequestStatus.OPEN, DropRequestStatus.CLAIMED_PENDING],
        },
        expiresAt: { lte: new Date() },
      },
      select: {
        id: true,
        requestorId: true,
        claimerId: true,
        shift: { select: { date: true } },
      },
    });

    if (stale.length === 0) return;

    await this.prisma.dropRequest.updateMany({
      where: { id: { in: stale.map((d) => d.id) } },
      data: { status: DropRequestStatus.EXPIRED },
    });

    for (const drop of stale) {
      const notifyIds = [drop.requestorId, drop.claimerId].filter(
        Boolean,
      ) as string[];
      await this.notifications.notifyMany(
        notifyIds,
        'DROP_EXPIRED',
        'Drop Request Expired',
        `The drop request for the shift on ${drop.shift.date.toISOString().split('T')[0]} has expired (24-hour window passed). The original assignment remains unchanged.`,
        { dropId: drop.id },
      );
    }
  }

  private async getDropOrThrow(dropId: string): Promise<DropWithRelations> {
    const drop = await this.prisma.dropRequest.findUnique({
      where: { id: dropId },
      include: DROP_INCLUDE,
    });
    if (!drop) throw new NotFoundException('Drop request not found.');
    return drop;
  }

  private async writeAuditLog(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    shiftId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId: actorId,
        shiftId,
        beforeState: (before as Prisma.InputJsonValue) ?? undefined,
        afterState: (after as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  private async assertUnderPendingLimit(userId: string) {
    const swapCount = await this.prisma.swapRequest.count({
      where: {
        OR: [{ initiatorId: userId }, { targetId: userId }],
        status: {
          in: [
            SwapRequestStatus.PENDING_PARTNER,
            SwapRequestStatus.PENDING_APPROVAL,
          ],
        },
      },
    });
    const dropCount = await this.prisma.dropRequest.count({
      where: {
        requestorId: userId,
        status: {
          in: [DropRequestStatus.OPEN, DropRequestStatus.CLAIMED_PENDING],
        },
      },
    });
    if (swapCount + dropCount >= 3) {
      throw new BadRequestException(
        'You cannot have more than 3 pending swap/drop requests at once.',
      );
    }
  }
}
