export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  points: number;
  reportCount: number;
  createdAt: string;
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
