export type SwapRequestStatus =
  | 'PENDING_PARTNER'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type DropRequestStatus =
  | 'OPEN'
  | 'CLAIMED_PENDING'
  | 'APPROVED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface SwapUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SwapShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isPremium: boolean;
  location: { id: string; name: string; timezone: string };
  requiredSkill: { id: string; name: string };
}

export interface SwapRequest {
  id: string;
  shiftId: string;
  initiatorId: string;
  targetId: string;
  status: SwapRequestStatus;
  targetRespondedAt: string | null;
  managerReviewedAt: string | null;
  managerId: string | null;
  managerNotes: string | null;
  cancelledReason: string | null;
  shift: SwapShift;
  initiator: SwapUser;
  target: SwapUser;
  manager: SwapUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface DropRequest {
  id: string;
  shiftId: string;
  requestorId: string;
  claimerId: string | null;
  status: DropRequestStatus;
  expiresAt: string;
  claimedAt: string | null;
  managerReviewedAt: string | null;
  managerId: string | null;
  managerNotes: string | null;
  shift: SwapShift;
  requestor: SwapUser;
  claimer: SwapUser | null;
  manager: SwapUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSwapRequestPayload {
  shiftId: string;
  targetUserId: string;
}

export interface RespondSwapPayload {
  accept: boolean;
}

export interface ReviewSwapPayload {
  approve: boolean;
  notes?: string;
}

export interface CreateDropRequestPayload {
  shiftId: string;
}

export interface ReviewDropPayload {
  approve: boolean;
  notes?: string;
}
