import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { differenceInMinutes, differenceInDays, subWeeks } from 'date-fns';
import type { QueryAnalyticsDto } from './dto/query-analytics.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns allowed location IDs for the actor.
  // null = unrestricted (admin with no location filter).
  private async getAllowedLocationIds(
    actor: JwtPayload,
    locationId?: string,
  ): Promise<string[]> {
    if (actor.role === UserRole.ADMIN) {
      if (locationId) return [locationId];
      const all = await this.prisma.location.findMany({ select: { id: true } });
      return all.map((l) => l.id);
    }

    const managed = await this.prisma.locationManager.findMany({
      where: { userId: actor.sub },
      select: { locationId: true },
    });
    const managedIds = managed.map((m) => m.locationId);

    if (locationId) {
      if (!managedIds.includes(locationId)) {
        throw new ForbiddenException('You do not manage this location.');
      }
      return [locationId];
    }

    return managedIds;
  }

  private getDateRange(query: QueryAnalyticsDto): { from: Date; to: Date } {
    const to = query.dateTo ? new Date(query.dateTo) : new Date();
    const from = query.dateFrom ? new Date(query.dateFrom) : subWeeks(to, 4);
    // Set to end of day for dateTo
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async getHoursDistribution(actor: JwtPayload, query: QueryAnalyticsDto) {
    const { from, to } = this.getDateRange(query);
    const allowedIds = await this.getAllowedLocationIds(
      actor,
      query.locationId,
    );

    const days = differenceInDays(to, from) + 1;
    const weeks = Math.max(days / 7, 1 / 7);

    const shiftFilter = {
      locationId: { in: allowedIds },
      startTime: { gte: from, lte: to },
    };

    // All assignments in range at allowed locations
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { shift: shiftFilter },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            desiredWeeklyHours: true,
          },
        },
        shift: { select: { startTime: true, endTime: true, status: true } },
      },
    });

    // All active certified staff at the location(s) — to capture zero-hour workers
    const certified = await this.prisma.userLocationCertification.findMany({
      where: {
        locationId: { in: allowedIds },
        decertifiedAt: null,
        user: { isActive: true },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            desiredWeeklyHours: true,
          },
        },
      },
    });

    type UserMeta = {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      desiredWeeklyHours: number | null;
    };

    const userMap = new Map<
      string,
      { user: UserMeta; minutes: number; hasDraft: boolean }
    >();

    // Seed map with all certified staff (ensures zero-hour staff appear)
    for (const c of certified) {
      if (!userMap.has(c.userId)) {
        userMap.set(c.userId, { user: c.user, minutes: 0, hasDraft: false });
      }
    }

    let includesDrafts = false;

    for (const a of assignments) {
      const minutes = differenceInMinutes(a.shift.endTime, a.shift.startTime);
      const isDraft = a.shift.status === 'DRAFT';
      if (isDraft) includesDrafts = true;

      const existing = userMap.get(a.userId);
      if (existing) {
        existing.minutes += minutes;
        if (isDraft) existing.hasDraft = true;
      } else {
        // Staff not in certified list but has an assignment (edge case)
        userMap.set(a.userId, {
          user: a.user,
          minutes,
          hasDraft: isDraft,
        });
      }
    }

    const entries = Array.from(userMap.values()).map(
      ({ user, minutes, hasDraft }) => {
        const totalHours = Math.round((minutes / 60) * 10) / 10;
        const weeklyAvg = Math.round((totalHours / weeks) * 10) / 10;
        const desiredHours = user.desiredWeeklyHours;
        const gap =
          desiredHours !== null
            ? Math.round((weeklyAvg - desiredHours) * 10) / 10
            : null;

        let status: 'on_target' | 'under' | 'over' | 'no_preference';
        if (desiredHours === null) {
          status = 'no_preference';
        } else if (weeklyAvg < desiredHours * 0.8) {
          status = 'under';
        } else if (weeklyAvg > desiredHours * 1.2) {
          status = 'over';
        } else {
          status = 'on_target';
        }

        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          totalHours,
          weeklyAvg,
          desiredHours,
          gap,
          status,
          hasDraftHours: hasDraft,
        };
      },
    );

    return {
      entries: entries.sort((a, b) => b.totalHours - a.totalHours),
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      weeks: Math.round(weeks * 10) / 10,
      includesDrafts,
    };
  }

  async getPremiumFairness(actor: JwtPayload, query: QueryAnalyticsDto) {
    const { from, to } = this.getDateRange(query);
    const allowedIds = await this.getAllowedLocationIds(
      actor,
      query.locationId,
    );

    const shiftFilter = {
      locationId: { in: allowedIds },
      startTime: { gte: from, lte: to },
    };

    // All assignments (defines the active worker pool for fairness measurement)
    const allAssignments = await this.prisma.shiftAssignment.findMany({
      where: { shift: shiftFilter },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (allAssignments.length === 0) {
      return { entries: [], totalPremiumShifts: 0, noPremiumShifts: true };
    }

    // Premium-only assignments
    const premiumAssignments = await this.prisma.shiftAssignment.findMany({
      where: { shift: { ...shiftFilter, isPremium: true } },
      select: { userId: true },
    });

    const totalPremiumShifts = premiumAssignments.length;

    // Build user pool (everyone who worked at least once in range)
    const userPool = new Map<
      string,
      { id: string; name: string; premiumCount: number }
    >();
    for (const a of allAssignments) {
      if (!userPool.has(a.userId)) {
        userPool.set(a.userId, {
          id: a.userId,
          name: `${a.user.firstName} ${a.user.lastName}`,
          premiumCount: 0,
        });
      }
    }

    // Count premium assignments per user
    for (const a of premiumAssignments) {
      const worker = userPool.get(a.userId);
      if (worker) worker.premiumCount++;
    }

    if (totalPremiumShifts === 0) {
      const entries = Array.from(userPool.values()).map((u) => ({
        userId: u.id,
        name: u.name,
        premiumCount: 0,
        fairShare: 0,
        score: 0,
      }));
      return { entries, totalPremiumShifts: 0, noPremiumShifts: true };
    }

    const fairShare = totalPremiumShifts / userPool.size;

    const entries = Array.from(userPool.values()).map((u) => ({
      userId: u.id,
      name: u.name,
      premiumCount: u.premiumCount,
      fairShare: Math.round(fairShare * 10) / 10,
      score: Math.round((u.premiumCount / fairShare) * 100) / 100,
    }));

    return {
      entries: entries.sort((a, b) => b.score - a.score),
      totalPremiumShifts,
      noPremiumShifts: false,
    };
  }

  async getOvertimeCost(actor: JwtPayload, query: QueryAnalyticsDto) {
    const { from, to } = this.getDateRange(query);
    const allowedIds = await this.getAllowedLocationIds(
      actor,
      query.locationId,
    );

    // Assignments at the queried location(s) — defines which staff to include
    const locationAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        shift: {
          locationId: { in: allowedIds },
          startTime: { gte: from, lte: to },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hourlyRate: true,
          },
        },
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    if (locationAssignments.length === 0) {
      return {
        entries: [],
        summary: {
          regularCost: 0,
          overtimeCost: 0,
          totalCost: 0,
          staffWithoutRate: 0,
        },
      };
    }

    const uniqueUserIds = [
      ...new Set(locationAssignments.map((a) => a.userId)),
    ];

    // Cross-location hours: get ALL assignments for these users in range
    // to correctly determine the weekly overtime threshold
    const allUserAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId: { in: uniqueUserIds },
        shift: { startTime: { gte: from, lte: to } },
      },
      include: {
        shift: { select: { startTime: true, endTime: true } },
      },
    });

    // Group all assignments by userId and by ISO week (Monday-based)
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    };

    const userWeekMinutes = new Map<string, Map<string, number>>();
    for (const a of allUserAssignments) {
      const weekKey = getWeekKey(new Date(a.shift.startTime));
      if (!userWeekMinutes.has(a.userId)) {
        userWeekMinutes.set(a.userId, new Map());
      }
      const weekMap = userWeekMinutes.get(a.userId)!;
      const mins = differenceInMinutes(a.shift.endTime, a.shift.startTime);
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + mins);
    }

    // Location-only hours per user (for the "hours at this location" column)
    const locationMinutes = new Map<string, number>();
    type UserMeta = {
      id: string;
      firstName: string;
      lastName: string;
      hourlyRate: { toNumber: () => number } | null;
    };
    const userInfo = new Map<string, UserMeta>();

    for (const a of locationAssignments) {
      userInfo.set(a.userId, a.user);
      const mins = differenceInMinutes(a.shift.endTime, a.shift.startTime);
      locationMinutes.set(
        a.userId,
        (locationMinutes.get(a.userId) ?? 0) + mins,
      );
    }

    const entries = Array.from(userInfo.values()).map((user) => {
      const weekMap = userWeekMinutes.get(user.id) ?? new Map<string, number>();

      // Per-week overtime calculation (correct approach)
      let regularMins = 0;
      let overtimeMins = 0;
      for (const weekMins of weekMap.values()) {
        regularMins += Math.min(weekMins, 40 * 60);
        overtimeMins += Math.max(weekMins - 40 * 60, 0);
      }

      const totalHours =
        Math.round(((regularMins + overtimeMins) / 60) * 10) / 10;
      const locationHours =
        Math.round(((locationMinutes.get(user.id) ?? 0) / 60) * 10) / 10;
      const regularHours = Math.round((regularMins / 60) * 10) / 10;
      const overtimeHours = Math.round((overtimeMins / 60) * 10) / 10;

      const rateUnset = user.hourlyRate === null;
      const rate = rateUnset ? 0 : user.hourlyRate!.toNumber();

      const regularCost = rateUnset
        ? null
        : Math.round(regularHours * rate * 100) / 100;
      const overtimeCost = rateUnset
        ? null
        : Math.round(overtimeHours * rate * 1.5 * 100) / 100;

      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        totalHours,
        locationHours,
        overtimeHours,
        regularCost,
        overtimeCost,
        rateUnset,
      };
    });

    const staffWithoutRate = entries.filter((e) => e.rateUnset).length;
    const regularCost = entries.reduce((s, e) => s + (e.regularCost ?? 0), 0);
    const overtimeCost = entries.reduce((s, e) => s + (e.overtimeCost ?? 0), 0);

    return {
      entries: entries.sort((a, b) => b.totalHours - a.totalHours),
      summary: {
        regularCost: Math.round(regularCost * 100) / 100,
        overtimeCost: Math.round(overtimeCost * 100) / 100,
        totalCost: Math.round((regularCost + overtimeCost) * 100) / 100,
        staffWithoutRate,
      },
    };
  }
}
