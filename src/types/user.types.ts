import type { FeaturedBadge } from '@/types/gamification.types';
import type { ReportWorkflowStatus } from '@/types/report-status.types';

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
  /** BE: account tạo bởi Company (mật khẩu tạm) — bắt đổi mật khẩu trước khi vào app */
  mustChangePassword?: boolean;
}

/**
 * Hồ sơ công khai của người dùng khác — `GET /v1/users/{id}/public-profile`.
 * KHÔNG chứa email/số điện thoại (BE chủ động không trả về).
 */
export interface PublicUserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  /** Null khi điểm bị khóa do nghi gian lận */
  points?: number | null;
  level?: number | null;
  rank?: number | null;
  reportCount: number;
  achievements: string[];
  featuredBadge?: FeaturedBadge | null;
  joinedAt: string;
}

/**
 * Báo cáo công khai trên hồ sơ người khác — `GET /v1/users/{id}/reports`.
 * BE không trả `address` để tránh lộ nơi ở của người gửi.
 */
export interface PublicUserReportItem {
  id: string;
  code: string;
  categoryName: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ReportWorkflowStatus;
  createdAt: string;
  imageUrl?: string | null;
}

export interface PublicUserReportsResponse {
  items: PublicUserReportItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
