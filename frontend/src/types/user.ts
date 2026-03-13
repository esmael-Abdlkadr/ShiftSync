export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  timezone: string;
  desiredWeeklyHours?: number;
  hourlyRate?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  _count?: {
    users: number;
  };
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  skill: Skill;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  timezone: string;
  _count?: {
    managers: number;
    certifiedStaff: number;
    shifts: number;
  };
}

export interface UserLocationCertification {
  id: string;
  userId: string;
  locationId: string;
  certifiedAt: string;
  decertifiedAt?: string | null;
  location: Location;
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface AvailabilityException {
  id: string;
  userId: string;
  date: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export interface UserWithDetails extends User {
  skills: UserSkill[];
  certifiedLocations: UserLocationCertification[];
  availability: Availability[];
  availabilityExceptions: AvailabilityException[];
}

export interface UserListItem extends User {
  skills: UserSkill[];
  certifiedLocations: UserLocationCertification[];
}

export interface PaginatedUsers {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  timezone?: string;
  desiredWeeklyHours?: number;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  timezone?: string;
  desiredWeeklyHours?: number;
  hourlyRate?: number;
}

export interface QueryUsersParams {
  search?: string;
  role?: UserRole;
  locationId?: string;
  skillId?: string;
  page?: number;
  limit?: number;
}

export interface AvailabilitySlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface CreateExceptionRequest {
  date: string;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
