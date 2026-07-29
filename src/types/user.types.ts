import type { FeaturedBadge } from '@/types/gamification.types';

/** Mobile roles — master plan §1 (LEO/Admin/CompanyManager không có shell mobile) */
export type UserRole =
  | 'Citizen'
  | 'Cleaner'
  | 'CompanyStaff'
  | 'Inspector';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  isPhoneVerified?: boolean;
  points?: number;
  reportCount?: number;
  achievements?: string[];
  featuredBadge?: FeaturedBadge | null;
  createdAt?: string;
  teamId?: string;
  teamName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** LoginResponse — login, refresh-token, google-login */
export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
}
