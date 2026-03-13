export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  locationId: string | null;
  shiftId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  location: {
    id: string;
    name: string;
  } | null;
}

export interface AuditLogsResponse {
  total: number;
  page: number;
  limit: number;
  entries: AuditLogEntry[];
}

export interface QueryAuditParams {
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}
