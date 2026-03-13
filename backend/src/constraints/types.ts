import { OverrideReason } from '@prisma/client';

export interface ConstraintCheckParams {
  userId: string;
  shiftId: string;
  shiftStart: Date;
  shiftEnd: Date;
  shiftDate: Date;
  locationId: string;
  locationTimezone: string;
  requiredSkillId: string;
  overrideReason?: OverrideReason;
  overrideNotes?: string;
}

export type ViolationSeverity = 'block' | 'warning' | 'override_required';

export interface Violation {
  rule: string;
  message: string;
  severity: ViolationSeverity;
}

export interface Suggestion {
  userId: string;
  name: string;
  weeklyHours: number;
  reason: string;
}

export interface ConstraintResult {
  ok: boolean;
  violations: Violation[];
  suggestions: Suggestion[];
  requiresOverride: boolean;
}
