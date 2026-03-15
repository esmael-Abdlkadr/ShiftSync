export interface HoursEntry {
  userId: string;
  name: string;
  email: string;
  totalHours: number;
  weeklyAvg: number;
  desiredHours: number | null;
  gap: number | null;
  status: 'on_target' | 'under' | 'over' | 'no_preference';
  hasDraftHours: boolean;
}

export interface HoursReport {
  entries: HoursEntry[];
  dateFrom: string;
  dateTo: string;
  weeks: number;
  includesDrafts: boolean;
}

export interface PremiumEntry {
  userId: string;
  name: string;
  premiumCount: number;
  fairShare: number;
  score: number;
}

export interface PremiumReport {
  entries: PremiumEntry[];
  totalPremiumShifts: number;
  noPremiumShifts: boolean;
}

export interface CostEntry {
  userId: string;
  name: string;
  totalHours: number;
  locationHours: number;
  overtimeHours: number;
  regularCost: number | null;
  overtimeCost: number | null;
  rateUnset: boolean;
  overtimeContributors: {
    shiftId: string;
    locationId: string;
    locationName: string;
    startTime: string;
    endTime: string;
    overtimeMinutes: number;
  }[];
}

export interface CostReport {
  entries: CostEntry[];
  summary: {
    regularCost: number;
    overtimeCost: number;
    totalCost: number;
    staffWithoutRate: number;
  };
}

export interface QueryAnalyticsParams {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
}
