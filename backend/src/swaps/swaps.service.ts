import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import type { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import type { RespondSwapDto } from './dto/respond-swap.dto';
import type { ReviewSwapDto } from './dto/review-swap.dto';
import type { QuerySwapsDto } from './dto/query-swaps.dto';

const SWAP_INCLUDE = {
  shift: {
    include: {
      location: { select: { id: true, name: true, timezone: true } },
      requiredSkill: { select: { id: true, name: true } },
    },
  },
  targetShift: {
    include: {
      location: { select: { id: true, name: true, timezone: true } },
      requiredSkill: { select: { id: true, name: true } },
    },
  },
  initiator: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  target: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  manager: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.SwapRequestInclude;

type SwapWithRelations = Prisma.SwapRequestGetPayload<{
  include: typeof SWAP_INCLUDE;
}>;

@Injectable()
export class SwapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly constraints: ConstraintsService,
    private readonly events: EventsService,
  ) {}

  async findAll(actor: JwtPayload, query: QuerySwapsDto) {
    const where: Prisma.SwapRequestWhereInput = {};

    if (query.status) where.status = query.status;

    if (actor.role === UserRole.STAFF) {
      where.OR = [{ initiatorId: actor.sub }, { targetId: actor.sub }];
    } else if (actor.role === UserRole.MANAGER) {
      const managed = await this.prisma.locationManager.findMany({
        where: { userId: actor.sub },
        select: { locationId: true },
      });
      const locationIds = managed.map((m) => m.locationId);
      where.AND = [
        { shift: { locationId: { in: locationIds } } },
        { targetShift: { locationId: { in: locationIds } } },
      ];
      if (query.locationId) {
        if (!locationIds.includes(query.locationId)) {
          where.AND.push({ shift: { locationId: { in: [] } } });
        } else {
          where.AND.push({
            OR: [
              { shift: { locationId: query.locationId } },
              { targetShift: { locationId: query.locationId } },
            ],
          });
        }
      }
    } else if (query.locationId) {
      where.OR = [
        { shift: { locationId: query.locationId } },
        { targetShift: { locationId: query.locationId } },
      ];
    }

    return this.prisma.swapRequest.findMany({
      where,
      include: SWAP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSwapRequest(actor: JwtPayload, dto: CreateSwapRequestDto) {
    if (actor.role !== UserRole.STAFF) {
      throw new ForbiddenException('Only staff members can request swaps.');
    }
    if (actor.sub === dto.targetUserId) {
      throw new BadRequestException('You cannot swap a shift with yourself.');
    }

    if (dto.shiftId === dto.targetShiftId) {
      throw new BadRequestException(
        'Swap requires two different shifts (offered and target).',
      );
    }

    const [shift, targetShift] = await Promise.all([
      this.prisma.shift.findUnique({
        where: { id: dto.shiftId },
        include: {
          location: { select: { id: true, name: true, timezone: true } },
          requiredSkill: { select: { id: true, name: true } },
          assignments: true,
        },
      }),
      this.prisma.shift.findUnique({
        where: { id: dto.targetShiftId },
        include: {
          location: { select: { id: true, name: true, timezone: true } },
          requiredSkill: { select: { id: true, name: true } },
          assignments: true,
        },
      }),
    ]);

    if (!shift || !targetShift) throw new NotFoundException('Shift not found.');
    if (shift.status !== 'PUBLISHED' || targetShift.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Both shifts must be published before requesting a swap.',
      );
    }

    const initiatorAssigned = shift.assignments.some((a) => a.userId === actor.sub);
    if (!initiatorAssigned) {
      throw new BadRequestException(
        'You are not assigned to the offered shift.',
      );
    }

    const targetAssigned = targetShift.assignments.some(
      (a) => a.userId === dto.targetUserId,
    );
    if (!targetAssigned) {
      throw new BadRequestException(
        'The target staff member is not assigned to the requested shift.',
      );
    }

    await this.assertUnderPendingLimit(actor.sub);
    await this.assertUnderPendingLimit(dto.targetUserId);
    await this.assertUserCanTakeShift(dto.targetUserId, shift);
    await this.assertUserCanTakeShift(actor.sub, targetShift);

    const existing = await this.prisma.swapRequest.findFirst({
      where: {
        shiftId: dto.shiftId,
        targetShiftId: dto.targetShiftId,
        initiatorId: actor.sub,
        targetId: dto.targetUserId,
        status: {
          in: [
            SwapRequestStatus.PENDING_PARTNER,
            SwapRequestStatus.PENDING_APPROVAL,
          ],
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'A pending swap request already exists for this shift and target.',
      );
    }

    const swap = await this.prisma.swapRequest.create({
      data: {
        shiftId: dto.shiftId,
        targetShiftId: dto.targetShiftId,
        initiatorId: actor.sub,
        targetId: dto.targetUserId,
        status: SwapRequestStatus.PENDING_PARTNER,
      },
      include: SWAP_INCLUDE,
    });

    await this.notifications.notify(
      dto.targetUserId,
      'SWAP_REQUEST',
      'Swap Request Received',
      `${swap.initiator.firstName} ${swap.initiator.lastName} proposes swapping their ${shift.requiredSkill.name} shift on ${shift.date.toISOString().split('T')[0]} for your ${targetShift.requiredSkill.name} shift on ${targetShift.date.toISOString().split('T')[0]}.`,
      { swapId: swap.id, shiftId: shift.id },
    );
    this.events.emitToUser(dto.targetUserId, 'swap:new', { swapId: swap.id });

    return swap;
  }

  async respondToSwap(actor: JwtPayload, swapId: string, dto: RespondSwapDto) {
    const swap = await this.getSwapOrThrow(swapId);
    this.assertStructuredSwap(swap);

    if (swap.targetId !== actor.sub) {
      throw new ForbiddenException(
        'Only the target staff member can respond to this swap request.',
      );
    }
    if (swap.status !== SwapRequestStatus.PENDING_PARTNER) {
      throw new BadRequestException(
        `Cannot respond to a swap in status "${swap.status}".`,
      );
    }

    if (!dto.accept) {
      const updated = await this.prisma.swapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapRequestStatus.CANCELLED,
          targetRespondedAt: new Date(),
        },
        include: SWAP_INCLUDE,
      });
      await this.notifications.notify(
        swap.initiatorId,
        'SWAP_REJECTED',
        'Swap Request Declined',
        `${swap.target.firstName} ${swap.target.lastName} declined your swap request for the shift on ${swap.shift.date.toISOString().split('T')[0]}.`,
        { swapId },
      );
      this.events.emitToUser(swap.initiatorId, 'swap:resolved', {
        swapId,
        status: 'CANCELLED',
      });
      return updated;
    }

    await this.assertAssignedToShift(swap.initiatorId, swap.shiftId);
    await this.assertAssignedToShift(swap.targetId, swap.targetShiftId);
    await this.assertUserCanTakeShift(swap.targetId, swap.shift);
    await this.assertUserCanTakeShift(swap.initiatorId, swap.targetShift);

    const managers = await this.prisma.locationManager.findMany({
      where: { locationId: { in: [swap.shift.locationId, swap.targetShift.locationId] } },
      select: { userId: true },
    });
    const managerIds = Array.from(new Set(managers.map((m) => m.userId)));

    const updated = await this.prisma.swapRequest.update({
      where: { id: swapId },
      data: {
        status: SwapRequestStatus.PENDING_APPROVAL,
        targetRespondedAt: new Date(),
      },
      include: SWAP_INCLUDE,
    });

    await this.notifications.notify(
      swap.initiatorId,
      'SWAP_ACCEPTED',
      'Swap Request Accepted',
      `${swap.target.firstName} ${swap.target.lastName} accepted your swap request. Waiting for manager approval.`,
      { swapId },
    );
    this.events.emitToUser(swap.initiatorId, 'swap:resolved', {
      swapId,
      status: 'PENDING_APPROVAL',
    });

    for (const managerId of managerIds) {
      await this.notifications.notify(
        managerId,
        'SWAP_PENDING_APPROVAL',
        'Swap Request Needs Approval',
        `${swap.initiator.firstName} ${swap.initiator.lastName} and ${swap.target.firstName} ${swap.target.lastName} request a shift exchange (${swap.shift.date.toISOString().split('T')[0]} and ${swap.targetShift.date.toISOString().split('T')[0]}). Your approval is required.`,
        { swapId },
      );
    }

    return updated;
  }

  async managerReviewSwap(
    actor: JwtPayload,
    swapId: string,
    dto: ReviewSwapDto,
  ) {
    const swap = await this.getSwapOrThrow(swapId);
    this.assertStructuredSwap(swap);

    if (swap.status !== SwapRequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Cannot review a swap in status "${swap.status}".`,
      );
    }

    if (actor.role === UserRole.MANAGER) {
      const managedLocations = await this.prisma.locationManager.findMany({
        where: { userId: actor.sub },
        select: { locationId: true },
      });
      const managedIds = managedLocations.map((l) => l.locationId);
      const canReview =
        managedIds.includes(swap.shift.locationId) &&
        managedIds.includes(swap.targetShift.locationId);
      if (!canReview)
        throw new ForbiddenException(
          "You must manage both shifts' locations to review this swap.",
        );
    } else if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only managers or admins can review swap requests.',
      );
    }

    if (!dto.approve) {
      const updated = await this.prisma.swapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapRequestStatus.CANCELLED,
          managerReviewedAt: new Date(),
          managerId: actor.sub,
          managerNotes: dto.notes ?? null,
          cancelledReason: 'Manager rejected the swap request.',
        },
        include: SWAP_INCLUDE,
      });
      await this.writeAuditLog(
        actor.sub,
        'REJECT_SWAP',
        'SwapRequest',
        swapId,
        swap.shiftId,
        swap,
        updated,
      );
      await this.notifications.notifyMany(
        [swap.initiatorId, swap.targetId],
        'SWAP_MANAGER_REJECTED',
        'Swap Request Rejected',
        `Your swap request for the shift on ${swap.shift.date.toISOString().split('T')[0]} was rejected by the manager.${dto.notes ? ` Reason: ${dto.notes}` : ''}`,
        { swapId },
      );
      this.events.emitToUser(swap.initiatorId, 'swap:resolved', {
        swapId,
        status: 'CANCELLED',
      });
      this.events.emitToUser(swap.targetId, 'swap:resolved', {
        swapId,
        status: 'CANCELLED',
      });
      return updated;
    }

    await this.assertAssignedToShift(swap.initiatorId, swap.shiftId);
    await this.assertAssignedToShift(swap.targetId, swap.targetShiftId);
    await this.assertUserCanTakeShift(swap.targetId, swap.shift);
    await this.assertUserCanTakeShift(swap.initiatorId, swap.targetShift);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.shiftAssignment.deleteMany({
        where: {
          OR: [
            { shiftId: swap.shiftId, userId: swap.initiatorId },
            { shiftId: swap.targetShiftId, userId: swap.targetId },
          ],
        },
      });

      await tx.shiftAssignment.createMany({
        data: [
          {
            shiftId: swap.shiftId,
            userId: swap.targetId,
            assignedById: actor.sub,
          },
          {
            shiftId: swap.targetShiftId,
            userId: swap.initiatorId,
            assignedById: actor.sub,
          },
        ],
      });

      return tx.swapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapRequestStatus.APPROVED,
          managerReviewedAt: new Date(),
          managerId: actor.sub,
          managerNotes: dto.notes ?? null,
        },
        include: SWAP_INCLUDE,
      });
    });

    await this.writeAuditLog(
      actor.sub,
      'APPROVE_SWAP',
      'SwapRequest',
      swapId,
      swap.shiftId,
      swap,
      updated,
    );
    await this.notifications.notifyMany(
      [swap.initiatorId, swap.targetId],
      'SWAP_APPROVED',
      'Swap Request Approved',
      `Your shift exchange (${swap.shift.date.toISOString().split('T')[0]} and ${swap.targetShift.date.toISOString().split('T')[0]}) has been approved by the manager.`,
      { swapId },
    );
    this.events.emitToUser(swap.initiatorId, 'swap:resolved', {
      swapId,
      status: 'APPROVED',
    });
    this.events.emitToUser(swap.targetId, 'swap:resolved', {
      swapId,
      status: 'APPROVED',
    });

    return updated;
  }

  async cancelSwap(actor: JwtPayload, swapId: string) {
    const swap = await this.getSwapOrThrow(swapId);

    if (swap.initiatorId !== actor.sub && actor.role === UserRole.STAFF) {
      throw new ForbiddenException(
        'Only the initiator can cancel a swap request.',
      );
    }

    const cancellableStatuses: SwapRequestStatus[] = [
      SwapRequestStatus.PENDING_PARTNER,
      SwapRequestStatus.PENDING_APPROVAL,
    ];
    if (!cancellableStatuses.includes(swap.status)) {
      throw new BadRequestException(
        `Cannot cancel a swap in status "${swap.status}".`,
      );
    }

    const updated = await this.prisma.swapRequest.update({
      where: { id: swapId },
      data: {
        status: SwapRequestStatus.CANCELLED,
        cancelledReason: 'Initiator cancelled the swap request.',
      },
      include: SWAP_INCLUDE,
    });

    if (swap.status === SwapRequestStatus.PENDING_PARTNER) {
      await this.notifications.notify(
        swap.targetId,
        'SWAP_CANCELLED',
        'Swap Request Cancelled',
        `${swap.initiator.firstName} ${swap.initiator.lastName} cancelled their swap request for the shift on ${swap.shift.date.toISOString().split('T')[0]}.`,
        { swapId },
      );
    } else {
      await this.notifications.notify(
        swap.targetId,
        'SWAP_CANCELLED',
        'Swap Request Cancelled',
        `${swap.initiator.firstName} ${swap.initiator.lastName} cancelled the swap request you had accepted. Your original assignment remains unchanged.`,
        { swapId },
      );
      const managers = await this.prisma.locationManager.findMany({
        where: { locationId: swap.shift.locationId },
        select: { userId: true },
      });
      for (const mgr of managers) {
        await this.notifications.notify(
          mgr.userId,
          'SWAP_CANCELLED',
          'Swap Request Cancelled',
          `The swap request between ${swap.initiator.firstName} ${swap.initiator.lastName} and ${swap.target.firstName} ${swap.target.lastName} has been cancelled. No action required.`,
          { swapId },
        );
      }
    }

    return updated;
  }

  async cancelSwapsForShift(shiftId: string, reason: string) {
    const pendingSwaps = await this.prisma.swapRequest.findMany({
      where: {
        OR: [{ shiftId }, { targetShiftId: shiftId }],
        status: {
          in: [
            SwapRequestStatus.PENDING_PARTNER,
            SwapRequestStatus.PENDING_APPROVAL,
          ],
        },
      },
      include: {
        initiator: { select: { id: true, firstName: true, lastName: true } },
        target: { select: { id: true, firstName: true, lastName: true } },
        shift: { select: { date: true } },
      },
    });

    for (const swap of pendingSwaps) {
      await this.prisma.swapRequest.update({
        where: { id: swap.id },
        data: { status: SwapRequestStatus.CANCELLED, cancelledReason: reason },
      });

      await this.notifications.notifyMany(
        [swap.initiatorId, swap.targetId],
        'SWAP_SHIFT_EDITED',
        'Swap Request Cancelled — Shift Modified',
        `Your swap request for the shift on ${swap.shift.date.toISOString().split('T')[0]} was automatically cancelled because the shift was modified by a manager.`,
        { swapId: swap.id, shiftId },
      );
    }
  }

  private async assertUserCanTakeShift(
    userId: string,
    shift: {
      id: string;
      startTime: Date;
      endTime: Date;
      date: Date;
      skillId: string;
      locationId: string;
      location: { timezone: string };
    },
  ) {
    const result = await this.constraints.check({
      userId,
      shiftId: shift.id,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      shiftDate: shift.date,
      locationId: shift.locationId,
      locationTimezone: shift.location.timezone,
      requiredSkillId: shift.skillId,
    });

    if (!result.ok) {
      const message =
        result.violations.find(
          (v) => v.severity === 'block' || v.severity === 'override_required',
        )?.message ?? 'Scheduling constraints prevent this swap.';
      throw new BadRequestException(message);
    }
  }

  private async assertAssignedToShift(userId: string, shiftId: string) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: { userId, shiftId },
      select: { id: true },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Swap cannot proceed because one of the original assignments has changed.',
      );
    }
  }

  private assertStructuredSwap(
    swap: SwapWithRelations,
  ): asserts swap is SwapWithRelations & {
    targetShiftId: string;
    targetShift: NonNullable<SwapWithRelations['targetShift']>;
  } {
    if (!swap.targetShiftId || !swap.targetShift) {
      throw new BadRequestException(
        'This swap request uses an old format and cannot be processed. Please cancel and create a new swap request.',
      );
    }
  }

  private async getSwapOrThrow(swapId: string): Promise<SwapWithRelations> {
    const swap = await this.prisma.swapRequest.findUnique({
      where: { id: swapId },
      include: SWAP_INCLUDE,
    });
    if (!swap) throw new NotFoundException('Swap request not found.');
    return swap;
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
        'A staff member cannot have more than 3 pending swap/drop requests at once.',
      );
    }
  }
}
