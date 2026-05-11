/** Mobile chỉ phân luồng Citizen vs CleanupTeam */
export type UserRole = 'Citizen' | 'CleanupTeam';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string | null;
  points?: number;
  reportCount?: number;
  createdAt?: string;
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
