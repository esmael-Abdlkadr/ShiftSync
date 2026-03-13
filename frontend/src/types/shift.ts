export type ShiftStatus = 'DRAFT' | 'PUBLISHED';
export type OverrideReason = 'EMERGENCY_COVERAGE' | 'EMPLOYEE_REQUEST' | 'BUSINESS_NEED' | 'OTHER';
export type ViolationSeverity = 'block' | 'warning' | 'override_required';
export type OvertimeRisk = 'low' | 'medium' | 'high';

export interface ShiftLocation {
  id: string;
  name: string;
  timezone: string;
}

export interface ShiftSkill {
  id: string;
  name: string;
}

export interface ShiftAssignedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hourlyRate?: number;
}

export interface ShiftAssignedBy {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  userId: string;
  overrideReason?: OverrideReason | null;
  overrideNotes?: string | null;
  createdAt: string;
  user: ShiftAssignedUser;
  assignedBy?: ShiftAssignedBy;
}

export interface Shift {
  id: string;
  locationId: string;
  skillId: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  status: ShiftStatus;
  isPremium: boolean;
  publishedAt?: string | null;
  editCutoffHours: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  location: ShiftLocation;
  requiredSkill: ShiftSkill;
  assignments: ShiftAssignment[];
}

export interface CreateShiftRequest {
  locationId: string;
  skillId: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  isPremium?: boolean;
  editCutoffHours?: number;
}

export interface UpdateShiftRequest {
  locationId?: string;
  skillId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  headcount?: number;
  isPremium?: boolean;
  editCutoffHours?: number;
}

export interface QueryShiftsParams {
  locationId?: string;
  weekStart?: string;
  status?: ShiftStatus;
  skillId?: string;
}

export interface AssignStaffRequest {
  userId: string;
  overrideReason?: OverrideReason;
  overrideNotes?: string;
}

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

export interface AssignStaffResponse {
  assigned: boolean;
  assignment?: ShiftAssignment;
  constraintResult: ConstraintResult;
}

export interface EligibleStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasConflict: boolean;
  currentWeeklyHours: number;
  projectedWeeklyHours: number;
  overtimeRisk: OvertimeRisk;
}

export interface WeeklyHoursEntry {
  userId: string;
  name: string;
  weeklyHours: number;
  status: 'on_track' | 'near_overtime' | 'overtime';
}
