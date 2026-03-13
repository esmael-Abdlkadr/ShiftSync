import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, differenceInMinutes, subDays } from 'date-fns';
import type {
  ConstraintCheckParams,
  ConstraintResult,
  Violation,
  Suggestion,
} from './types';

@Injectable()
export class ConstraintsService {
  constructor(private readonly prisma: PrismaService) {}

  async check(params: ConstraintCheckParams): Promise<ConstraintResult> {
    const violations: Violation[] = [];
    const {
      userId,
      shiftId,
      shiftStart,
      shiftEnd,
      shiftDate,
      locationId,
      locationTimezone,
      requiredSkillId,
      overrideReason,
    } = params;

    const [user, existingAssignments] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          skills: true,
          certifiedLocations: { where: { decertifiedAt: null } },
          availability: true,
          availabilityExceptions: true,
        },
      }),
      this.prisma.shiftAssignment.findMany({
        where: { userId, shiftId: { not: shiftId } },
        include: { shift: true },
      }),
    ]);

    if (!user) {
      violations.push({
        rule: 'USER_NOT_FOUND',
        message: 'User not found.',
        severity: 'block',
      });
      return {
        ok: false,
        violations,
        suggestions: [],
        requiresOverride: false,
      };
    }

    // Check 1 — Skill
    const hasSkill = user.skills.some((s) => s.skillId === requiredSkillId);
    if (!hasSkill) {
      const skill = await this.prisma.skill.findUnique({
        where: { id: requiredSkillId },
      });
      violations.push({
        rule: 'SKILL_MISMATCH',
        message: `${user.firstName} ${user.lastName} does not have the required skill "${skill?.name ?? requiredSkillId}".`,
        severity: 'block',
      });
    }

    // Check 2 — Location certification
    const hasCert = user.certifiedLocations.some(
      (c) => c.locationId === locationId,
    );
    if (!hasCert) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
      });
      violations.push({
        rule: 'NO_LOCATION_CERT',
        message: `${user.firstName} ${user.lastName} is not certified to work at "${location?.name ?? locationId}".`,
        severity: 'block',
      });
    }

    // Check 3 — No overlap (any location)
    const overlapping = existingAssignments.filter((a) => {
      const s = a.shift;
      return s.startTime < shiftEnd && s.endTime > shiftStart;
    });
    if (overlapping.length > 0) {
      const conflict = overlapping[0].shift;
      violations.push({
        rule: 'DOUBLE_BOOKING',
        message: `${user.firstName} ${user.lastName} is already assigned to a shift from ${conflict.startTime.toISOString()} to ${conflict.endTime.toISOString()}.`,
        severity: 'block',
      });
    }

    // Check 4 — 10-hour rest gap
    const shiftStartMs = shiftStart.getTime();
    const shiftEndMs = shiftEnd.getTime();
    const tenHoursMs = 10 * 60 * 60 * 1000;

    const restViolation = existingAssignments.find((a) => {
      const s = a.shift;
      const prevEndToNewStart = shiftStartMs - s.endTime.getTime();
      const newEndToPrevStart = s.startTime.getTime() - shiftEndMs;
      return (
        (prevEndToNewStart >= 0 && prevEndToNewStart < tenHoursMs) ||
        (newEndToPrevStart >= 0 && newEndToPrevStart < tenHoursMs)
      );
    });
    if (restViolation) {
      violations.push({
        rule: 'REST_GAP',
        message: `${user.firstName} ${user.lastName} needs at least 10 hours of rest between shifts. This assignment does not meet that requirement.`,
        severity: 'block',
      });
    }

    // Check 5 — Availability (timezone-aware)
    const shiftStartInUserTz = toZonedTime(shiftStart, user.timezone);
    const shiftEndInUserTz = toZonedTime(shiftEnd, user.timezone);

    const dayNames = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    const shiftDayOfWeek = dayNames[shiftStartInUserTz.getDay()];
    const shiftDateStr = shiftStartInUserTz.toISOString().split('T')[0];

    // Check exception first
    const exception = user.availabilityExceptions.find((ex) => {
      const exDate = new Date(ex.date).toISOString().split('T')[0];
      return exDate === shiftDateStr;
    });

    let availabilityBlocked = false;
    if (exception) {
      if (!exception.isAvailable) {
        availabilityBlocked = true;
        violations.push({
          rule: 'AVAILABILITY_EXCEPTION',
          message: `${user.firstName} ${user.lastName} has marked themselves as unavailable on this date.${exception.reason ? ` Reason: ${exception.reason}` : ''}`,
          severity: 'block',
        });
      } else if (exception.startTime && exception.endTime) {
        const [exStartH, exStartM] = exception.startTime.split(':').map(Number);
        const [exEndH, exEndM] = exception.endTime.split(':').map(Number);
        const shiftStartMin =
          shiftStartInUserTz.getHours() * 60 + shiftStartInUserTz.getMinutes();
        const shiftEndMin =
          shiftEndInUserTz.getHours() * 60 + shiftEndInUserTz.getMinutes();
        const exStartMin = exStartH * 60 + exStartM;
        const exEndMin = exEndH * 60 + exEndM;
        if (shiftStartMin < exStartMin || shiftEndMin > exEndMin) {
          availabilityBlocked = true;
          violations.push({
            rule: 'AVAILABILITY_WINDOW',
            message: `${user.firstName} ${user.lastName} is only available ${exception.startTime}–${exception.endTime} on this date (their timezone).`,
            severity: 'block',
          });
        }
      }
    } else {
      const recurringAvail = user.availability.find(
        (a) => a.dayOfWeek === shiftDayOfWeek,
      );
      if (!recurringAvail) {
        availabilityBlocked = true;
        violations.push({
          rule: 'NO_AVAILABILITY',
          message: `${user.firstName} ${user.lastName} has no availability set for ${shiftDayOfWeek}.`,
          severity: 'block',
        });
      } else {
        const [avStartH, avStartM] = recurringAvail.startTime
          .split(':')
          .map(Number);
        const [avEndH, avEndM] = recurringAvail.endTime.split(':').map(Number);
        const shiftStartMin =
          shiftStartInUserTz.getHours() * 60 + shiftStartInUserTz.getMinutes();
        const shiftEndMin =
          shiftEndInUserTz.getHours() * 60 + shiftEndInUserTz.getMinutes();
        const avStartMin = avStartH * 60 + avStartM;
        const avEndMin = avEndH * 60 + avEndM;
        if (shiftStartMin < avStartMin || shiftEndMin > avEndMin) {
          availabilityBlocked = true;
          violations.push({
            rule: 'AVAILABILITY_WINDOW',
            message: `${user.firstName} ${user.lastName} is only available ${recurringAvail.startTime}–${recurringAvail.endTime} on ${shiftDayOfWeek} (their timezone: ${user.timezone}).`,
            severity: 'block',
          });
        }
      }
    }

    // Check 6, 7 — Daily hours
    if (!availabilityBlocked) {
      const dayStart = startOfDay(toZonedTime(shiftStart, locationTimezone));
      const dayEnd = endOfDay(toZonedTime(shiftStart, locationTimezone));
      const dayStartUtc = fromZonedTime(dayStart, locationTimezone);
      const dayEndUtc = fromZonedTime(dayEnd, locationTimezone);

      const sameDayAssignments = existingAssignments.filter((a) => {
        return (
          a.shift.startTime >= dayStartUtc && a.shift.startTime <= dayEndUtc
        );
      });

      const existingDailyMinutes = sameDayAssignments.reduce((sum, a) => {
        return sum + differenceInMinutes(a.shift.endTime, a.shift.startTime);
      }, 0);
      const newShiftMinutes = differenceInMinutes(shiftEnd, shiftStart);
      const totalDailyMinutes = existingDailyMinutes + newShiftMinutes;
      const totalDailyHours = totalDailyMinutes / 60;

      if (totalDailyHours > 12) {
        violations.push({
          rule: 'DAILY_HOURS_HARD',
          message: `This assignment would bring ${user.firstName} ${user.lastName} to ${totalDailyHours.toFixed(1)} hours in a single day (max 12h).`,
          severity: 'block',
        });
      } else if (totalDailyHours > 8) {
        violations.push({
          rule: 'DAILY_HOURS_WARN',
          message: `${user.firstName} ${user.lastName} will work ${totalDailyHours.toFixed(1)} hours today (over 8h recommended limit).`,
          severity: 'warning',
        });
      }
    }

    // Check 8, 9 — Weekly hours
    const weekStart = this.getWeekStart(shiftDate, locationTimezone);
    const weekEnd = this.getWeekEnd(shiftDate, locationTimezone);

    const weeklyAssignments = existingAssignments.filter((a) => {
      return a.shift.startTime >= weekStart && a.shift.startTime <= weekEnd;
    });
    const existingWeeklyMinutes = weeklyAssignments.reduce((sum, a) => {
      return sum + differenceInMinutes(a.shift.endTime, a.shift.startTime);
    }, 0);
    const projectedWeeklyHours =
      (existingWeeklyMinutes + differenceInMinutes(shiftEnd, shiftStart)) / 60;

    if (projectedWeeklyHours >= 40) {
      violations.push({
        rule: 'WEEKLY_HOURS_40',
        message: `${user.firstName} ${user.lastName} will reach ${projectedWeeklyHours.toFixed(1)} hours this week (at or over the 40h overtime threshold).`,
        severity: 'warning',
      });
    } else if (projectedWeeklyHours >= 35) {
      violations.push({
        rule: 'WEEKLY_HOURS_35',
        message: `${user.firstName} ${user.lastName} will reach ${projectedWeeklyHours.toFixed(1)} hours this week (approaching 40h overtime threshold).`,
        severity: 'warning',
      });
    }

    // Check 10, 11 — Consecutive days
    const consecutiveDays = await this.countConsecutiveDays(
      userId,
      shiftDate,
      locationTimezone,
    );

    if (consecutiveDays >= 6) {
      if (consecutiveDays >= 6 && !overrideReason) {
        violations.push({
          rule: 'SEVENTH_DAY',
          message: `${user.firstName} ${user.lastName} would be working their ${consecutiveDays + 1}th consecutive day. A manager override with documented reason is required.`,
          severity: 'override_required',
        });
      } else if (consecutiveDays === 5) {
        violations.push({
          rule: 'SIXTH_DAY',
          message: `${user.firstName} ${user.lastName} would be working their 6th consecutive day this week.`,
          severity: 'warning',
        });
      }
    } else if (consecutiveDays === 5) {
      violations.push({
        rule: 'SIXTH_DAY',
        message: `${user.firstName} ${user.lastName} would be working their 6th consecutive day this week.`,
        severity: 'warning',
      });
    }

    const hardBlocks = violations.filter((v) => v.severity === 'block');
    const requiresOverride = violations.some(
      (v) => v.severity === 'override_required',
    );
    const ok = hardBlocks.length === 0 && !requiresOverride;

    let suggestions: Suggestion[] = [];
    if (hardBlocks.length > 0) {
      suggestions = await this.getSuggestions({
        shiftStart,
        shiftEnd,
        locationId,
        requiredSkillId,
        excludeUserId: userId,
        weekStart,
        weekEnd,
      });
    }

    return { ok, violations, suggestions, requiresOverride };
  }

  private getWeekStart(date: Date, tz: string): Date {
    const zoned = toZonedTime(date, tz);
    const day = zoned.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(zoned);
    monday.setDate(zoned.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return fromZonedTime(monday, tz);
  }

  private getWeekEnd(date: Date, tz: string): Date {
    const weekStart = this.getWeekStart(date, tz);
    const zoned = toZonedTime(weekStart, tz);
    zoned.setDate(zoned.getDate() + 6);
    zoned.setHours(23, 59, 59, 999);
    return fromZonedTime(zoned, tz);
  }

  private async countConsecutiveDays(
    userId: string,
    shiftDate: Date,
    locationTimezone: string,
  ): Promise<number> {
    // Look back 7 days
    const checkFrom = subDays(toZonedTime(shiftDate, locationTimezone), 7);
    const checkFromUtc = fromZonedTime(checkFrom, locationTimezone);

    const recentAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId,
        shift: { startTime: { gte: checkFromUtc, lt: shiftDate } },
      },
      include: { shift: { select: { startTime: true } } },
      distinct: ['shiftId'],
    });

    // Get unique calendar days worked (in location timezone)
    const workedDays = new Set(
      recentAssignments.map((a) => {
        const d = toZonedTime(a.shift.startTime, locationTimezone);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    const shiftDayZoned = toZonedTime(shiftDate, locationTimezone);
    let consecutive = 0;
    const checkDay = new Date(shiftDayZoned);
    checkDay.setDate(checkDay.getDate() - 1);

    for (let i = 0; i < 7; i++) {
      const key = `${checkDay.getFullYear()}-${checkDay.getMonth()}-${checkDay.getDate()}`;
      if (workedDays.has(key)) {
        consecutive++;
        checkDay.setDate(checkDay.getDate() - 1);
      } else {
        break;
      }
    }

    return consecutive;
  }

  private async getSuggestions(params: {
    shiftStart: Date;
    shiftEnd: Date;
    locationId: string;
    requiredSkillId: string;
    excludeUserId: string;
    weekStart: Date;
    weekEnd: Date;
  }): Promise<Suggestion[]> {
    const {
      shiftStart,
      shiftEnd,
      locationId,
      requiredSkillId,
      excludeUserId,
      weekStart,
      weekEnd,
    } = params;

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        isActive: true,
        skills: { some: { skillId: requiredSkillId } },
        certifiedLocations: { some: { locationId, decertifiedAt: null } },
      },
      include: {
        shiftAssignments: {
          include: { shift: true },
          where: { shift: { startTime: { gte: weekStart, lte: weekEnd } } },
        },
      },
      take: 10,
    });

    const available: Suggestion[] = [];

    for (const candidate of candidates) {
      const hasConflict = candidate.shiftAssignments.some((a) => {
        const s = a.shift;
        return s.startTime < shiftEnd && s.endTime > shiftStart;
      });
      if (hasConflict) continue;

      const weeklyMinutes = candidate.shiftAssignments.reduce((sum, a) => {
        return sum + differenceInMinutes(a.shift.endTime, a.shift.startTime);
      }, 0);
      const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

      available.push({
        userId: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        weeklyHours,
        reason: `Has required skill and location certification. Currently at ${weeklyHours}h this week.`,
      });

      if (available.length >= 3) break;
    }

    return available.sort((a, b) => a.weeklyHours - b.weeklyHours);
  }

  async getProjectedWeeklyHours(
    userId: string,
    shiftDate: Date,
    locationTimezone: string,
  ): Promise<number> {
    const weekStart = this.getWeekStart(shiftDate, locationTimezone);
    const weekEnd = this.getWeekEnd(shiftDate, locationTimezone);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId,
        shift: { startTime: { gte: weekStart, lte: weekEnd } },
      },
      include: { shift: { select: { startTime: true, endTime: true } } },
    });

    const totalMinutes = assignments.reduce((sum, a) => {
      return sum + differenceInMinutes(a.shift.endTime, a.shift.startTime);
    }, 0);

    return Math.round((totalMinutes / 60) * 10) / 10;
  }
}
