import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  timezone: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
